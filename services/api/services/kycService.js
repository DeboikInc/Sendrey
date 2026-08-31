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

class KYCService {

    constructor() {
        this.uploadDir = 'uploads';
    }


    async checkDuplicateDocument(userId, docHash, docType) {
        const self = await Runner.findById(userId).select('verificationDocuments');
        const selfDocs = self?.verificationDocuments || {};
        const otherFieldType = docType === 'nin' ? 'driverLicense' : 'nin';

        if (selfDocs[otherFieldType]?.documentHash === docHash) {
            return {
                blocked: true,
                userFacing: true,
                error: `This is the same document you already submitted as your ${otherFieldType === 'nin' ? 'NIN' : 'Driver License'}. Please upload a different, valid ID.`
            };
        }

        // Case 2: different account, same image — possible fraud, don't tip them off
        const other = await Runner.findOne({
            _id: { $ne: userId },
            $or: [
                { 'verificationDocuments.nin.documentHash': docHash },
                { 'verificationDocuments.driverLicense.documentHash': docHash }
            ]
        }).select('_id');

        if (other) {
            return {
                blocked: false, // let it through, don't alert the submitter
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

    async runAutomatedVerification(userId, selfieBuffer) {
        const runner = await Runner.findById(userId);
        const docs = runner.verificationDocuments || {};

        const doc = docs.nin?.documentPath ? { type: 'nin', premblyType: 'ID', path: docs.nin.documentPath }
            : docs.driverLicense?.documentPath ? { type: 'driverLicense', premblyType: 'DL', path: docs.driverLicense.documentPath }
                : null;

        if (!doc) return;

        try {
            const docImageBase64 = await urlToBase64(doc.path);
            const selfieImageBase64 = selfieBuffer.toString('base64');

            const result = await premblyService.verifyDocumentWithFace({
                docImageBase64, selfieImageBase64, docType: doc.premblyType
            });

            if (result.skipped) return; // call failed — stays pending_review, admin handles it

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
                await this.rejectSelfie(userId, `Automated face match failed (confidence ${result.confidence})`);
            }
            // else 'manual_review' — leave as pending_review; admin now sees the confidence score in getRunnerVerificationDetails
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
            const dupCheck = await this.checkDuplicateDocument(userInfo.userId, docHash, 'driver_license');

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

            await this.runAutomatedVerification(userId, fileBuffer);

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

    // ==================== ADMIN METHODS ====================

    async getPendingVerifications() {
        try {
            const pendingRunners = await Runner.find({
                role: 'runner',
                $and: [
                    {
                        $or: [
                            { 'verificationDocuments.nin.status': 'pending_review' },
                            { 'verificationDocuments.passport.status': 'pending_review' },
                            { 'verificationDocuments.driverLicense.status': 'pending_review' },
                            { 'biometricVerification.status': 'pending_review' }
                        ]
                    },
                    { 'verificationDocuments.nin.status': { $ne: 'rejected' } },
                    { 'verificationDocuments.passport.status': { $ne: 'rejected' } },
                    { 'verificationDocuments.driverLicense.status': { $ne: 'rejected' } },
                    { 'biometricVerification.status': { $ne: 'rejected' } }
                ]
            }).select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');

            return pendingRunners.map(runner => ({
                id: runner._id,
                firstName: runner.firstName,
                lastName: runner.lastName,
                email: runner.email,
                phone: runner.phone,
                fleetType: runner.fleetType,
                createdAt: runner.createdAt,
                kycStatus: runner.kycStatus,
                pendingItems: this.getPendingItems(runner)
            }));

        } catch (error) {
            console.error('Error fetching pending verifications:', error);
            throw error;
        }
    }

    getPendingItems(runner) {
        const pending = [];
        const docs = runner.verificationDocuments || {};
        const bio = runner.biometricVerification || {};

        if (docs.nin?.status === 'pending_review') pending.push('NIN');
        if (docs.driverLicense?.status === 'pending_review') pending.push('Driver License');
        if (docs.passport?.status === 'pending_review') pending.push('Passport');
        if (bio.status === 'pending_review') pending.push('Selfie');

        return pending;
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
            const validTypes = ['nin', 'driverLicense', 'passport'];
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

            await Runner.findByIdAndUpdate(runnerId, { kycStatus: newStatus, isVerifiedKyc });

            console.log('[approveDocument]', documentType, '→ kycStatus:', newStatus, 'isVerifiedKyc:', isVerifiedKyc);
            return { success: true, kycStatus: newStatus };
        } catch (error) {
            console.error('Error approving document:', error);
            return { success: false, error: error.message };
        }
    }

    async rejectDocument(runnerId, documentType, reason) {
        try {
            const validTypes = ['nin', 'driverLicense', 'passport'];
            if (!validTypes.includes(documentType)) return { success: false, error: 'Invalid document type' };

            const updateField = `verificationDocuments.${documentType}`;
            await Runner.findByIdAndUpdate(runnerId, {
                [`${updateField}.verified`]: false,
                [`${updateField}.status`]: 'rejected',
                [`${updateField}.rejectedAt`]: new Date(),
                [`${updateField}.rejectionReason`]: reason,
            });

            const newStatus = await this.calculateRunnerStatus(runnerId);
            const isVerifiedKyc = newStatus === 'approved_full';
            await Runner.findByIdAndUpdate(runnerId, { kycStatus: newStatus, isVerifiedKyc });

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

            await Runner.findByIdAndUpdate(runnerId, { kycStatus: newStatus, isVerifiedKyc });

            console.log('[approveSelfie] → kycStatus:', newStatus, 'isVerifiedKyc:', isVerifiedKyc);
            return { success: true, kycStatus: newStatus, isVerifiedKyc };
        } catch (error) {
            console.error('Error approving selfie:', error);
            return { success: false, error: error.message };
        }
    }


    async rejectSelfie(runnerId, reason) {
        try {
            await Runner.findByIdAndUpdate(runnerId, {
                'biometricVerification.selfieVerified': false,
                'biometricVerification.status': 'rejected',
                'biometricVerification.rejectedAt': new Date(),
                'biometricVerification.rejectionReason': reason,
            });

            const newStatus = await this.calculateRunnerStatus(runnerId);
            const isVerifiedKyc = newStatus === 'approved_full';
            await Runner.findByIdAndUpdate(runnerId, { kycStatus: newStatus, isVerifiedKyc });

            return { success: true, kycStatus: newStatus };
        } catch (error) {
            console.error('Error rejecting selfie:', error);
            return { success: false, error: error.message };
        }
    }

    async calculateRunnerStatus(runnerId) {
        const runner = await Runner.findById(runnerId);
        if (!runner || runner.role !== 'runner') return 'pending_verification';

        const docs = runner.verificationDocuments || {};
        const biometrics = runner.biometricVerification || {};

        const rejectedItems = [];
        if (docs.nin?.status === 'rejected') rejectedItems.push('nin');
        if (docs.driverLicense?.status === 'rejected') rejectedItems.push('driverLicense');
        if (biometrics.status === 'rejected') rejectedItems.push('selfie');
        if (rejectedItems.length > 0) return 'rejected'; // <-- new, checked first

        const verifiedDocs = [];
        if (docs.nin?.verified) verifiedDocs.push('nin');
        if (docs.driverLicense?.verified) verifiedDocs.push('driverLicense');

        const pendingDocs = [];
        if (docs.nin?.status === 'pending_review') pendingDocs.push('nin');
        if (docs.driverLicense?.status === 'pending_review') pendingDocs.push('driverLicense');

        if (pendingDocs.length > 0 || biometrics.status === 'pending_review') return 'pending_verification';
        if (verifiedDocs.length === 0) return 'pending_verification';
        if (verifiedDocs.length >= 1 && biometrics.selfieVerified) return 'approved_full';
        if (verifiedDocs.length >= 1) return 'approved_limited';
        return 'pending_verification';
    }

    async getVerifiedRunners() {
        try {
            const verifiedRunners = await Runner.find({
                role: 'runner',
                kycStatus: { $in: ['approved_full', 'approved_limited'] }
            }).select('firstName lastName email fleetType phone createdAt verificationDocuments biometricVerification kycStatus');

            return verifiedRunners.map(runner => ({
                id: runner._id,
                firstName: runner.firstName,
                lastName: runner.lastName,
                email: runner.email,
                // isKycVerified: runner.isKycVerified,
                phone: runner.phone,
                fleetType: runner.fleetType,
                createdAt: runner.createdAt,
                kycStatus: runner.kycStatus,
                pendingItems: [] // Verified runners have no pending items
            }));

        } catch (error) {
            console.error('Error fetching verified runners:', error);
            throw error;
        }
    }

    async getRejectedVerifications() {
        const runners = await Runner.find({ role: 'runner', kycStatus: 'rejected' })
            .select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');
        return runners.map(r => ({
            id: r._id, firstName: r.firstName, lastName: r.lastName, email: r.email,
            phone: r.phone, fleetType: r.fleetType, createdAt: r.createdAt, kycStatus: r.kycStatus,
            rejectedItems: this.getRejectedItems(r),
            faceMatchScore: r.biometricVerification?.faceMatchScore
        }));
    }

    getRejectedItems(runner) {
        const out = [];
        const docs = runner.verificationDocuments || {};
        const bio = runner.biometricVerification || {};
        if (docs.nin?.status === 'rejected') out.push({ type: 'NIN', reason: docs.nin.rejectionReason, auto: docs.nin.rejectedBy === 'prembly-auto' });
        if (docs.driverLicense?.status === 'rejected') out.push({ type: 'Driver License', reason: docs.driverLicense.rejectionReason });
        if (bio.status === 'rejected') out.push({ type: 'Selfie', reason: bio.rejectionReason, auto: bio.rejectionReason?.startsWith('Automated') });
        return out;
    }

    async getFlaggedVerifications() {
        const runners = await Runner.find({
            role: 'runner',
            $or: [
                { 'verificationDocuments.nin.flaggedForReview': true },
                { 'verificationDocuments.driverLicense.flaggedForReview': true }
            ]
        }).select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');
        return runners.map(r => ({
            id: r._id, firstName: r.firstName, lastName: r.lastName, email: r.email,
            phone: r.phone, fleetType: r.fleetType, createdAt: r.createdAt, kycStatus: r.kycStatus,
            flaggedItems: this.getFlaggedItems(r),
            faceMatchScore: r.biometricVerification?.faceMatchScore
        }));
    }

    getFlaggedItems(runner) {
        const out = [];
        const docs = runner.verificationDocuments || {};
        if (docs.nin?.flaggedForReview) out.push({ type: 'NIN', reason: docs.nin.flaggedReason });
        if (docs.driverLicense?.flaggedForReview) out.push({ type: 'Driver License', reason: docs.driverLicense.flaggedReason });
        return out;
    }

    async getAutoConfirmedVerifications() {
        const runners = await Runner.find({
            role: 'runner',
            $or: [
                { 'verificationDocuments.nin.verifiedBy': 'prembly-auto' },
                { 'verificationDocuments.driverLicense.verifiedBy': 'prembly-auto' },
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
        const runners = await Runner.find({
            role: 'runner',
            $and: [
                {
                    $or: [
                        { 'verificationDocuments.nin.wasResubmitted': true },
                        { 'verificationDocuments.driverLicense.wasResubmitted': true },
                        { 'biometricVerification.wasResubmitted': true }
                    ]
                },
                { 'verificationDocuments.nin.status': { $ne: 'rejected' } },
                { 'verificationDocuments.passport.status': { $ne: 'rejected' } },
                { 'verificationDocuments.driverLicense.status': { $ne: 'rejected' } },
                { 'biometricVerification.status': { $ne: 'rejected' } }
            ]
        }).select('firstName lastName email phone fleetType createdAt verificationDocuments biometricVerification kycStatus');
        return runners.map(r => ({
            id: r._id, firstName: r.firstName, lastName: r.lastName, email: r.email,
            phone: r.phone, fleetType: r.fleetType, createdAt: r.createdAt, kycStatus: r.kycStatus,
            resubmittedItems: this.getResubmittedItems(r),
            faceMatchScore: r.biometricVerification?.faceMatchScore
        }));
    }

    getResubmittedItems(runner) {
        const out = [];
        const docs = runner.verificationDocuments || {};
        const bio = runner.biometricVerification || {};
        if (docs.nin?.wasResubmitted) out.push({ type: 'NIN', previousReason: docs.nin.previousRejectionReason });
        if (docs.driverLicense?.wasResubmitted) out.push({ type: 'Driver License', previousReason: docs.driverLicense.previousRejectionReason });
        if (bio.wasResubmitted) out.push({ type: 'Selfie', previousReason: bio.previousRejectionReason });
        return out;
    }
}

module.exports = KYCService;