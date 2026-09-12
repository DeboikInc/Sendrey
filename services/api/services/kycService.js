// services/kycService.js
const Runner = require('../models/Runner');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const fs = require('fs').promises;
const premblyService = require('./premblyService');
const axios = require('axios');
const crypto = require('crypto');

async function urlToBase64(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data).toString('base64');
}

function hashBuffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

const SINGLE_DOC_FLEETS = ['pedestrian', 'cycling'];
const ALL_DOC_FIELDS = ['nin', 'driverLicense', 'bikerLicense'];

function getSecondDocType(fleetType) {
    if (SINGLE_DOC_FLEETS.includes(fleetType)) return null;
    return fleetType === 'bike' ? 'bikerLicense' : 'driverLicense';
}

function getRequiredDocFields(fleetType) {
    if (SINGLE_DOC_FLEETS.includes(fleetType)) return ['nin'];
    const secondDoc = getSecondDocType(fleetType);
    return ['nin', secondDoc];
}

function getRelevantVerificationItems(runner) {
    const requiredFields = getRequiredDocFields(runner.fleetType);
    const docs = runner.verificationDocuments || {};
    const bio = runner.biometricVerification || {};

    const labels = { nin: 'NIN', driverLicense: 'Driver License', bikerLicense: "Biker's License" };

    const items = requiredFields.map(field => ({
        field,
        label: labels[field],
        status: docs[field]?.status || 'not_submitted',
        verified: docs[field]?.verified || false,
        flaggedForReview: docs[field]?.flaggedForReview || false,
        flaggedReason: docs[field]?.flaggedReason || null,
        wasResubmitted: docs[field]?.wasResubmitted || false,
        previousRejectionReason: docs[field]?.previousRejectionReason || null,
        rejectionReason: docs[field]?.rejectionReason || null,
        rejectedBy: docs[field]?.rejectedBy || null,
    }));

    items.push({
        field: 'selfie',
        label: 'Selfie',
        status: bio.status || 'not_submitted',
        verified: bio.selfieVerified || false,
        flaggedForReview: false,
        flaggedReason: null,
        wasResubmitted: bio.wasResubmitted || false,
        previousRejectionReason: bio.previousRejectionReason || null,
        rejectionReason: bio.rejectionReason || null,
        rejectedBy: bio.rejectionReason?.startsWith('Automated') ? 'prembly-auto' : null,
    });

    return items;
}
class KYCService {

    constructor() {
        this.uploadDir = 'uploads';
    }

    async checkDuplicateDocument(userId, docHash, docType) {
        const otherFields = ALL_DOC_FIELDS.filter(f => f !== docType);

        const self = await Runner.findById(userId).select('verificationDocuments');
        const selfDocs = self?.verificationDocuments || {};

        const matchedField = otherFields.find(f => selfDocs[f]?.documentHash === docHash);
        if (matchedField) {
            const label = matchedField === 'nin' ? 'NIN' : matchedField === 'driverLicense' ? 'Driver License' : "Biker's License";
            return {
                blocked: true,
                userFacing: true,
                error: `This is the same document you already submitted as your ${label}. Please upload a different, valid ID.`
            };
        }

        const other = await Runner.findOne({
            _id: { $ne: userId },
            $or: ALL_DOC_FIELDS.map(f => ({ [`verificationDocuments.${f}.documentHash`]: docHash }))
        }).select('_id firstName lastName email');

        if (other) {
            return {
                blocked: false,
                flagForReview: true,
                flaggedReason: `Document hash matches an existing submission from another account (${other._id}: ${other.firstName || ''} ${other.lastName || ''} - ${other.email || ''})`
            };
        }

        return { blocked: false, flagForReview: false };
    }

    async saveDocumentToCloudinary(fileBuffer, documentType, userId, originalName) {
        try {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: `kyc/${documentType}`,
                        public_id: `${userId}_${Date.now()}`,
                        resource_type: 'auto',
                        tags: [documentType, userId, 'kyc']
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            resolve({
                                success: true,
                                cloudinaryUrl: result.secure_url,
                                cloudinaryPublicId: result.public_id,
                                filename: originalName,
                                format: result.format,
                                resourceType: result.resource_type
                            });
                        }
                    }
                );

                streamifier.createReadStream(fileBuffer).pipe(uploadStream);
            });
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async saveDocument(fileBuffer, documentType, userId, originalName) {
        try {
            const ext = path.extname(originalName);
            const filename = `${userId}_${Date.now()}${ext}`;
            const filepath = path.join(this.uploadDir, documentType, filename);

            // create dir if it dont exist
            await fs.mkdir(path.dirname(filepath), { recursive: true });
            await fs.writeFile(filepath, fileBuffer);

            return {
                success: true,
                filename,
                filepath,
                relativePath: `/uploads/kyc/${documentType}/${filename}`
            };
        } catch (error) {
            console.error('Error saving document:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async runAutomatedVerification(userId) {
        const runner = await Runner.findById(userId);
        if (!runner) return;

        const docs = runner.verificationDocuments || {};
        const bio = runner.biometricVerification || {};
        const requiredFields = getRequiredDocFields(runner.fleetType);

        const missingDoc = requiredFields.find(f => !docs[f]?.documentPath);
        if (missingDoc || !bio.selfieImage) {
            // Not everything this fleet type needs has been submitted yet —
            // stay on manual/pending review, don't call Prembly prematurely.
            return;
        }

        const primaryField = docs.nin?.documentPath ? 'nin' : requiredFields.find(f => f !== 'nin');
        const doc = {
            type: primaryField,
            premblyType: primaryField === 'nin' ? 'ID' : 'DL',
            path: docs[primaryField]?.documentPath,
        };

        try {
            const docImageBase64 = await urlToBase64(doc.path);
            const selfieImageBase64 = await urlToBase64(bio.selfieImage);

            const result = await premblyService.verifyDocumentWithFace({
                docImageBase64, selfieImageBase64, docType: doc.premblyType
            });

            if (result.skipped) return;

            const docField = `verificationDocuments.${doc.type}`;
            await Runner.findByIdAndUpdate(userId, {
                'biometricVerification.faceMatchScore': result.confidence,
                'biometricVerification.provider': 'prembly',
                'biometricVerification.verificationId': result.reference,
                'biometricVerification.verificationData': result.raw,
                [`${docField}.verificationId`]: result.reference,
                [`${docField}.verificationData`]: result.extractedData
            });

            if (result.decision === 'auto_approve') {
                await this.approveDocument(userId, doc.type, 'prembly-auto');
                await this.approveSelfie(userId, 'prembly-auto');
            } else if (result.decision === 'auto_reject') {
                await this.rejectSelfie(userId, `Automated face match failed (confidence ${result.confidence})`, 'prembly-auto');
            }
            // else 'manual_review' — leave as pending_review
        } catch (err) {
            console.error('[KYC] Automated verification error, staying on manual review:', err.message);
        }
    }

    async submitNIN(nin, fileBuffer, fileName, userInfo = {}) {
        try {
            const docHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dupCheck = await this.checkDuplicateDocument(userInfo.userId, docHash, 'nin');

            if (dupCheck.blocked) {
                return { success: false, error: dupCheck.error, documentType: 'nin' };
            }

            const existing = await Runner.findById(userInfo.userId).select('verificationDocuments.nin');
            const priorNin = existing?.verificationDocuments?.nin;
            const wasRejected = priorNin?.status === 'rejected';

            const uploadResult = await this.saveDocumentToCloudinary(fileBuffer, 'nin', userInfo.userId, fileName);
            if (!uploadResult.success) {
                return { success: false, error: 'Failed to upload document', documentType: 'nin' };
            }

            // Update runner document with Cloudinary URL
            await Runner.findByIdAndUpdate(userInfo.userId, {
                'verificationDocuments.nin': {
                    status: 'pending_review',
                    verified: false,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    documentHash: docHash,
                    flaggedForReview: dupCheck.flagForReview || false,
                    flaggedReason: dupCheck.flaggedReason || null,
                    wasResubmitted: wasRejected,
                    previousRejectedAt: wasRejected ? priorNin.rejectedAt : undefined,
                    previousRejectionReason: wasRejected ? priorNin.rejectionReason : undefined,
                    submittedAt: new Date(),
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth
                }
            });

            await Runner.findByIdAndUpdate(userInfo.userId, {
                kycStatus: await this.calculateRunnerStatus(userInfo.userId)
            });

            await this.runAutomatedVerification(userId);

            return {
                success: true,
                verified: false,
                documentType: 'nin',
                status: 'pending_review',
                data: {
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date()
                }
            };

        } catch (error) {
            console.error('NIN Submission Error:', error);
            return {
                success: false,
                error: error.message || 'NIN submission failed',
                documentType: 'nin'
            };
        }
    }

    async submitDriverLicense(licenseNumber, fileBuffer, fileName, userInfo = {}) {
        try {
            const docHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dupCheck = await this.checkDuplicateDocument(userInfo.userId, docHash, 'driverLicense');

            if (dupCheck.blocked) {
                return { success: false, error: dupCheck.error, documentType: 'driver_license' };
            }

            const existing = await Runner.findById(userInfo.userId).select('verificationDocuments.driverLicense');
            const priorDriverLicense = existing?.verificationDocuments?.driverLicense;
            const wasRejected = priorDriverLicense?.status === 'rejected';

            const uploadResult = await this.saveDocumentToCloudinary(fileBuffer, 'driver_license', userInfo.userId, fileName);
            if (!uploadResult.success) {
                return { success: false, error: 'Failed to upload document', documentType: 'driver_license' };
            }

            // Update runner document with Cloudinary URL
            await Runner.findByIdAndUpdate(userInfo.userId, {
                'verificationDocuments.driverLicense': {
                    status: 'pending_review',
                    verified: false,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    documentHash: docHash,
                    flaggedForReview: dupCheck.flagForReview || false,
                    flaggedReason: dupCheck.flaggedReason || null,
                    wasResubmitted: wasRejected,
                    previousRejectedAt: wasRejected ? priorDriverLicense.rejectedAt : undefined,
                    previousRejectionReason: wasRejected ? priorDriverLicense.rejectionReason : undefined,
                    submittedAt: new Date(),
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth
                }
            });

            await Runner.findByIdAndUpdate(userInfo.userId, {
                kycStatus: await this.calculateRunnerStatus(userInfo.userId)
            });

            await this.runAutomatedVerification(userId);

            return {
                success: true,
                verified: false,
                documentType: 'driver_license',
                status: 'pending_review',
                data: {
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date()
                }
            };

        } catch (error) {
            console.error('Driver License Submission Error:', error);
            return {
                success: false,
                error: error.message || 'Driver license submission failed',
                documentType: 'driver_license'
            };
        }
    }

    async submitBikerLicense(licenseNumber, fileBuffer, fileName, userInfo = {}) {
        try {
            const docHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const dupCheck = await this.checkDuplicateDocument(userInfo.userId, docHash, 'bikerLicense');

            if (dupCheck.blocked) {
                return { success: false, error: dupCheck.error, documentType: 'biker_license' };
            }

            const existing = await Runner.findById(userInfo.userId).select('verificationDocuments.bikerLicense');
            const priorBikerLicense = existing?.verificationDocuments?.bikerLicense;
            const wasRejected = priorBikerLicense?.status === 'rejected';

            const uploadResult = await this.saveDocumentToCloudinary(fileBuffer, 'biker_license', userInfo.userId, fileName);
            if (!uploadResult.success) {
                return { success: false, error: 'Failed to upload document', documentType: 'biker_license' };
            }

            await Runner.findByIdAndUpdate(userInfo.userId, {
                'verificationDocuments.bikerLicense': {
                    status: 'pending_review',
                    verified: false,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    documentHash: docHash,
                    flaggedForReview: dupCheck.flagForReview || false,
                    flaggedReason: dupCheck.flaggedReason || null,
                    wasResubmitted: wasRejected,
                    previousRejectedAt: wasRejected ? priorBikerLicense.rejectedAt : undefined,
                    previousRejectionReason: wasRejected ? priorBikerLicense.rejectionReason : undefined,
                    submittedAt: new Date(),
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth
                }
            });

            await Runner.findByIdAndUpdate(userInfo.userId, {
                kycStatus: await this.calculateRunnerStatus(userInfo.userId)
            });

            await this.runAutomatedVerification(userId);

            return {
                success: true,
                verified: false,
                documentType: 'biker_license',
                status: 'pending_review',
                data: {
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date()
                }
            };

        } catch (error) {
            console.error('Biker License Submission Error:', error);
            return {
                success: false,
                error: error.message || 'Biker license submission failed',
                documentType: 'biker_license'
            };
        }
    }

    async submitSelfie(fileBuffer, fileName, userId) {
        try {
            const uploadResult = await this.saveDocumentToCloudinary(
                fileBuffer,
                'selfie',
                userId,
                fileName
            );

            if (!uploadResult.success) {
                return {
                    success: false,
                    error: 'Failed to upload selfie'
                };
            }

            // Update runner biometric verification with Cloudinary URL
            await Runner.findByIdAndUpdate(userId, {
                'biometricVerification': {
                    status: 'pending_review',
                    selfieVerified: false,
                    selfieImage: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date()
                }
            });

            await this.runAutomatedVerification(userId);

            return {
                success: true,
                verified: false,
                status: 'pending_review',
                data: {
                    selfiePath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date()
                }
            };

        } catch (error) {
            console.error('Selfie Submission Error:', error);
            return {
                success: false,
                error: error.message || 'Selfie submission failed'
            };
        }
    }

    // ==================== ADMIN METHODS ====================

    async deleteDocument(cloudinaryPublicId) {
        try {
            const result = await cloudinary.uploader.destroy(cloudinaryPublicId);

            if (result.result === 'ok') {
                return { success: true };
            } else {
                return { success: false, error: 'Failed to delete from Cloudinary' };
            }
        } catch (error) {
            console.error('Error deleting document from Cloudinary:', error);
            return { success: false, error: error.message };
        }
    }

    async getPendingVerifications() {
        try {
            const candidates = await Runner.find({
                role: 'runner',
                $or: [
                    { 'verificationDocuments.nin.status': 'pending_review' },
                    { 'verificationDocuments.driverLicense.status': 'pending_review' },
                    { 'verificationDocuments.bikerLicense.status': 'pending_review' },
                    { 'biometricVerification.status': 'pending_review' }
                ]
            }).select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');

            return candidates
                .filter(runner => {
                    const items = getRelevantVerificationItems(runner);
                    if (items.some(i => i.status === 'rejected')) return false;
                    return items.some(i => i.status === 'pending_review');
                })
                .map(runner => ({
                    id: runner._id,
                    firstName: runner.firstName,
                    lastName: runner.lastName,
                    email: runner.email,
                    phone: runner.phone,
                    fleetType: runner.fleetType,
                    createdAt: runner.createdAt,
                    kycStatus: runner.kycStatus,
                    pendingItems: getRelevantVerificationItems(runner)
                        .filter(i => i.status === 'pending_review')
                        .map(i => i.label)
                }));
        } catch (error) {
            console.error('Error fetching pending verifications:', error);
            throw error;
        }
    }

    async getRunnerVerificationDetails(runnerId) {
        try {
            const runner = await Runner.findById(runnerId);
            if (!runner) return null;

            const docs = runner.verificationDocuments || {};
            const bio = runner.biometricVerification || {};

            return {
                id: runner._id,
                firstName: runner.firstName,
                lastName: runner.lastName,
                email: runner.email,
                phone: runner.phone,
                fleetType: runner.fleetType,
                dateOfBirth: runner.dateOfBirth,
                createdAt: runner.createdAt,
                kycStatus: runner.kycStatus,
                isVerified: runner.isVerified,
                isVerifiedKyc: runner.isVerifiedKyc,
                verifiedAt: runner.isVerifiedKycAt,
                documents: {
                    nin: {
                        status: docs.nin?.status || 'not_submitted',
                        verified: docs.nin?.verified || false,
                        submittedAt: docs.nin?.submittedAt,
                        documentPath: docs.nin?.documentPath,
                        verifiedAt: docs.nin?.verifiedAt,
                        verifiedBy: docs.nin?.verifiedBy,
                        rejectedAt: docs.nin?.rejectedAt,
                        rejectionReason: docs.nin?.rejectionReason,
                        flaggedForReview: docs.nin?.flaggedForReview || false,
                        flaggedReason: docs.nin?.flaggedReason || null,
                        wasResubmitted: docs.nin?.wasResubmitted || false,
                        previousRejectionReason: docs.nin?.previousRejectionReason || null
                    },
                    driverLicense: {
                        status: docs.driverLicense?.status || 'not_submitted',
                        verified: docs.driverLicense?.verified || false,
                        submittedAt: docs.driverLicense?.submittedAt,
                        documentPath: docs.driverLicense?.documentPath,
                        verifiedAt: docs.driverLicense?.verifiedAt,
                        verifiedBy: docs.driverLicense?.verifiedBy,
                        rejectedAt: docs.driverLicense?.rejectedAt,
                        rejectionReason: docs.driverLicense?.rejectionReason,
                        flaggedForReview: docs.driverLicense?.flaggedForReview || false,
                        flaggedReason: docs.driverLicense?.flaggedReason || null,
                        wasResubmitted: docs.driverLicense?.wasResubmitted || false,
                        previousRejectionReason: docs.driverLicense?.previousRejectionReason || null
                    },
                    bikerLicense: {
                        status: docs.bikerLicense?.status || 'not_submitted',
                        verified: docs.bikerLicense?.verified || false,
                        submittedAt: docs.bikerLicense?.submittedAt,
                        documentPath: docs.bikerLicense?.documentPath,
                        verifiedAt: docs.bikerLicense?.verifiedAt,
                        verifiedBy: docs.bikerLicense?.verifiedBy,
                        rejectedAt: docs.bikerLicense?.rejectedAt,
                        rejectionReason: docs.bikerLicense?.rejectionReason,
                        flaggedForReview: docs.bikerLicense?.flaggedForReview || false,
                        flaggedReason: docs.bikerLicense?.flaggedReason || null,
                        wasResubmitted: docs.bikerLicense?.wasResubmitted || false,
                        previousRejectionReason: docs.bikerLicense?.previousRejectionReason || null
                    }
                },
                biometrics: {
                    status: bio.status || 'not_submitted',
                    selfieVerified: bio.selfieVerified || false,
                    selfieImage: bio.selfieImage,
                    submittedAt: bio.submittedAt,
                    verifiedAt: bio.verifiedAt,
                    verifiedBy: bio.verifiedBy,
                    rejectedAt: bio.rejectedAt,
                    rejectionReason: bio.rejectionReason,
                    faceMatchScore: bio.faceMatchScore,
                    wasResubmitted: bio.wasResubmitted || false,
                    previousRejectionReason: bio.previousRejectionReason || null
                }
            };
        } catch (error) {
            console.error('Error fetching runner details:', error);
            throw error;
        }
    }

    async approveDocument(runnerId, documentType, adminId = 'admin') {
        try {
            const validTypes = ['nin', 'driverLicense', 'bikerLicense'];
            if (!validTypes.includes(documentType)) return { success: false, error: 'Invalid document type' };

            const updateField = `verificationDocuments.${documentType}`;

            await Runner.findByIdAndUpdate(runnerId, {
                [`${updateField}.verified`]: true,
                [`${updateField}.status`]: 'approved',
                [`${updateField}.verifiedAt`]: new Date(),
                [`${updateField}.verifiedBy`]: adminId,
            });

            const newStatus = await this.calculateRunnerStatus(runnerId);
            const isVerifiedKyc = newStatus === 'approved_full';

            await Runner.findByIdAndUpdate(runnerId, {
                kycStatus: newStatus,
                isVerifiedKyc,
                isVerifiedKycAt: isVerifiedKyc ? new Date() : null,
            });

            console.log('[approveDocument]', documentType, '→ kycStatus:', newStatus, 'isVerifiedKyc:', isVerifiedKyc);
            return { success: true, kycStatus: newStatus };
        } catch (error) {
            console.error('Error approving document:', error);
            return { success: false, error: error.message };
        }
    }

    async rejectDocument(runnerId, documentType, reason, adminId = 'admin') {
        try {
            const validTypes = ['nin', 'driverLicense', 'bikerLicense'];
            if (!validTypes.includes(documentType)) return { success: false, error: 'Invalid document type' };

            const updateField = `verificationDocuments.${documentType}`;
            await Runner.findByIdAndUpdate(runnerId, {
                [`${updateField}.verified`]: false,
                [`${updateField}.status`]: 'rejected',
                [`${updateField}.rejectedAt`]: new Date(),
                [`${updateField}.rejectionReason`]: reason,
                [`${updateField}.rejectedBy`]: adminId,
            });

            const newStatus = await this.calculateRunnerStatus(runnerId);
            const isVerifiedKyc = newStatus === 'approved_full';
            await Runner.findByIdAndUpdate(runnerId, {
                kycStatus: newStatus,
                isVerifiedKyc,
                isVerifiedKycAt: isVerifiedKyc ? new Date() : null,
            });

            return { success: true, kycStatus: newStatus };
        } catch (error) {
            console.error('Error rejecting document:', error);
            return { success: false, error: error.message };
        }
    }

    async approveSelfie(runnerId, adminId = 'admin') {
        try {
            await Runner.findByIdAndUpdate(runnerId, {
                'biometricVerification.selfieVerified': true,
                'biometricVerification.status': 'approved',
                'biometricVerification.verifiedAt': new Date(),
                'biometricVerification.verifiedBy': adminId,
            });

            const newStatus = await this.calculateRunnerStatus(runnerId);
            const isVerifiedKyc = newStatus === 'approved_full';

            await Runner.findByIdAndUpdate(runnerId, {
                kycStatus: newStatus,
                isVerifiedKyc,
                isVerifiedKycAt: isVerifiedKyc ? new Date() : null,
            });

            console.log('[approveSelfie] → kycStatus:', newStatus, 'isVerifiedKyc:', isVerifiedKyc);
            return { success: true, kycStatus: newStatus, isVerifiedKyc };
        } catch (error) {
            console.error('Error approving selfie:', error);
            return { success: false, error: error.message };
        }
    }

    async rejectSelfie(runnerId, reason, adminId = 'admin') {
        try {
            await Runner.findByIdAndUpdate(runnerId, {
                'biometricVerification.selfieVerified': false,
                'biometricVerification.status': 'rejected',
                'biometricVerification.rejectedAt': new Date(),
                'biometricVerification.rejectionReason': reason,
                'biometricVerification.rejectedBy': adminId,
            });

            const newStatus = await this.calculateRunnerStatus(runnerId);
            const isVerifiedKyc = newStatus === 'approved_full';
            await Runner.findByIdAndUpdate(runnerId, {
                kycStatus: newStatus,
                isVerifiedKyc,
                isVerifiedKycAt: isVerifiedKyc ? new Date() : null,
            });

            return { success: true, kycStatus: newStatus };
        } catch (error) {
            console.error('Error rejecting selfie:', error);
            return { success: false, error: error.message };
        }
    }

    async calculateRunnerStatus(runnerId) {
        const runner = await Runner.findById(runnerId);
        if (!runner || runner.role !== 'runner') return 'pending_verification';

        const items = getRelevantVerificationItems(runner);

        if (items.some(i => i.status === 'rejected')) return 'rejected';
        if (items.some(i => i.flaggedForReview)) return 'pending_verification';
        if (items.some(i => i.status === 'pending_review')) return 'pending_verification';

        const verifiedDocs = items.filter(i => i.field !== 'selfie' && i.verified);
        const selfie = items.find(i => i.field === 'selfie');

        if (verifiedDocs.length === 0) return 'pending_verification';
        if (verifiedDocs.length >= 1 && selfie?.verified) return 'approved_full';
        if (verifiedDocs.length >= 1) return 'approved_limited';
        return 'pending_verification';
    }

    async getVerifiedRunners() {
        try {
            const verifiedRunners = await Runner.find({
                role: 'runner',
                kycStatus: { $in: ['approved_full', 'approved_limited'] },
                'verificationDocuments.nin.flaggedForReview': { $ne: true },
                'verificationDocuments.driverLicense.flaggedForReview': { $ne: true },
                'verificationDocuments.bikerLicense.flaggedForReview': { $ne: true }
            }).select('firstName lastName email fleetType phone createdAt verificationDocuments biometricVerification kycStatus isVerifiedKycAt');

            return verifiedRunners.map(runner => {
                let verifiedBy = null;

                if (runner.kycStatus === 'approved_full') {
                    verifiedBy = runner.biometricVerification?.verifiedBy || null;
                } else {
                    const verifiedDoc = getRelevantVerificationItems(runner).find(i => i.field !== 'selfie' && i.verified);
                    verifiedBy = verifiedDoc ? runner.verificationDocuments?.[verifiedDoc.field]?.verifiedBy || null : null;
                }

                return {
                    id: runner._id,
                    firstName: runner.firstName,
                    lastName: runner.lastName,
                    email: runner.email,
                    phone: runner.phone,
                    fleetType: runner.fleetType,
                    createdAt: runner.createdAt,
                    kycStatus: runner.kycStatus,
                    verifiedAt: runner.isVerifiedKycAt,
                    verifiedBy,
                    pendingItems: []
                };
            });
        } catch (error) {
            console.error('Error fetching verified runners:', error);
            throw error;
        }
    }

    async getRejectedVerifications() {
        const candidates = await Runner.find({ role: 'runner', kycStatus: 'rejected' })
            .select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');

        return candidates
            .filter(runner => getRelevantVerificationItems(runner).some(i => i.status === 'rejected'))
            .map(runner => {
                const rejectedItems = getRelevantVerificationItems(runner).filter(i => i.status === 'rejected');
                const rejectedBy = rejectedItems[rejectedItems.length - 1]?.rejectedBy || null;

                return {
                    id: runner._id, firstName: runner.firstName, lastName: runner.lastName, email: runner.email,
                    phone: runner.phone, fleetType: runner.fleetType, createdAt: runner.createdAt, kycStatus: runner.kycStatus,
                    rejectedItems: rejectedItems.map(i => ({ type: i.label, reason: i.rejectionReason, auto: i.rejectedBy === 'prembly-auto' })),
                    rejectedBy,
                    faceMatchScore: runner.biometricVerification?.faceMatchScore
                };
            });
    }

    async getFlaggedVerifications() {
        const candidates = await Runner.find({
            role: 'runner',
            $or: [
                { 'verificationDocuments.nin.flaggedForReview': true },
                { 'verificationDocuments.driverLicense.flaggedForReview': true },
                { 'verificationDocuments.bikerLicense.flaggedForReview': true }
            ]
        }).select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');

        return candidates
            .filter(runner => getRelevantVerificationItems(runner).some(i => i.flaggedForReview))
            .map(runner => ({
                id: runner._id, firstName: runner.firstName, lastName: runner.lastName, email: runner.email,
                phone: runner.phone, fleetType: runner.fleetType, createdAt: runner.createdAt, kycStatus: runner.kycStatus,
                flaggedItems: getRelevantVerificationItems(runner)
                    .filter(i => i.flaggedForReview)
                    .map(i => ({ type: i.label, reason: i.flaggedReason })),
                faceMatchScore: runner.biometricVerification?.faceMatchScore
            }));
    }

    async getAutoConfirmedVerifications() {
        const runners = await Runner.find({
            role: 'runner',
            $or: [
                { 'verificationDocuments.nin.verifiedBy': 'prembly-auto' },
                { 'verificationDocuments.driverLicense.verifiedBy': 'prembly-auto' },
                { 'verificationDocuments.bikerLicense.verifiedBy': 'prembly-auto' },
                { 'biometricVerification.verifiedBy': 'prembly-auto' }
            ]
        }).select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');
        return runners.map(r => ({
            id: r._id, firstName: r.firstName, lastName: r.lastName, email: r.email,
            phone: r.phone, fleetType: r.fleetType, createdAt: r.createdAt, kycStatus: r.kycStatus,
            faceMatchScore: r.biometricVerification?.faceMatchScore
        }));
    }

    async getResubmittedVerifications() {
        const candidates = await Runner.find({
            role: 'runner',
            $or: [
                { 'verificationDocuments.nin.wasResubmitted': true },
                { 'verificationDocuments.driverLicense.wasResubmitted': true },
                { 'verificationDocuments.bikerLicense.wasResubmitted': true },
                { 'biometricVerification.wasResubmitted': true }
            ]
        }).select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');

        return candidates
            .filter(runner => {
                const items = getRelevantVerificationItems(runner);
                if (!items.some(i => i.wasResubmitted)) return false;
                return !items.some(i => i.status === 'rejected');
            })
            .map(runner => ({
                id: runner._id, firstName: runner.firstName, lastName: runner.lastName, email: runner.email,
                phone: runner.phone, fleetType: runner.fleetType, createdAt: runner.createdAt, kycStatus: runner.kycStatus,
                resubmittedItems: getRelevantVerificationItems(runner)
                    .filter(i => i.wasResubmitted)
                    .map(i => ({ type: i.label, previousReason: i.previousRejectionReason })),
                faceMatchScore: runner.biometricVerification?.faceMatchScore
            }));
    }

}

module.exports = KYCService;
module.exports.getRelevantVerificationItems = getRelevantVerificationItems;