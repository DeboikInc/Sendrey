// services/kycService.js
const Runner = require('../models/Runner');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const fs = require('fs').promises;

class KYCService {

    constructor() {
        this.uploadDir = 'uploads';
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

    // STATUS ENGINE

    _computeStatus(runner) {
        const docs = runner.verificationDocuments || {};
        const biometrics = runner.biometricVerification || {};

        const rejectedItems = [];
        if (docs.nin?.status === 'rejected') rejectedItems.push('nin');
        if (docs.driverLicense?.status === 'rejected') rejectedItems.push('driverLicense');
        if (biometrics.status === 'rejected') rejectedItems.push('selfie');
        if (rejectedItems.length > 0) return 'rejected';

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

    async _applyKycUpdate(runnerId, mutateFn, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const runner = await Runner.findById(runnerId);
            if (!runner) return null;

            mutateFn(runner);

            const newStatus = this._computeStatus(runner);
            runner.kycStatus = newStatus;
            runner.isVerifiedKyc = newStatus === 'approved_full';

            try {
                await runner.save(); 
                return { success: true, kycStatus: newStatus, isVerifiedKyc: runner.isVerifiedKyc };
            } catch (err) {
                if (err.name === 'VersionError' && attempt < maxRetries - 1) continue;
                throw err;
            }
        }
    }

    async calculateRunnerStatus(runnerId) {
        const runner = await Runner.findById(runnerId);
        if (!runner || runner.role !== 'runner') return 'pending_verification';
        return this._computeStatus(runner);
    }

    // SUBMISSION METHODS

    async submitNIN(nin, fileBuffer, fileName, userInfo = {}) {
        try {
            const uploadResult = await this.saveDocumentToCloudinary(
                fileBuffer,
                'nin',
                userInfo.userId,
                fileName
            );

            if (!uploadResult.success) {
                return {
                    success: false,
                    error: 'Failed to upload document',
                    documentType: 'nin'
                };
            }

            const result = await this._applyKycUpdate(userInfo.userId, (runner) => {
                runner.verificationDocuments.nin = {
                    status: 'pending_review',
                    verified: false,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date(),
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth
                };
            });

            if (!result) {
                return { success: false, error: 'Runner not found', documentType: 'nin' };
            }

            return {
                success: true,
                verified: false,
                documentType: 'nin',
                status: 'pending_review',
                kycStatus: result.kycStatus,
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
            const uploadResult = await this.saveDocumentToCloudinary(
                fileBuffer,
                'driver_license',
                userInfo.userId,
                fileName
            );

            if (!uploadResult.success) {
                return {
                    success: false,
                    error: 'Failed to upload document',
                    documentType: 'driver_license'
                };
            }

            const result = await this._applyKycUpdate(userInfo.userId, (runner) => {
                runner.verificationDocuments.driverLicense = {
                    status: 'pending_review',
                    verified: false,
                    documentPath: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date(),
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth
                };
            });

            if (!result) {
                return { success: false, error: 'Runner not found', documentType: 'driver_license' };
            }

            return {
                success: true,
                verified: false,
                documentType: 'driver_license',
                status: 'pending_review',
                kycStatus: result.kycStatus,
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

            const result = await this._applyKycUpdate(userId, (runner) => {
                runner.biometricVerification = {
                    status: 'pending_review',
                    selfieVerified: false,
                    selfieImage: uploadResult.cloudinaryUrl,
                    cloudinaryPublicId: uploadResult.cloudinaryPublicId,
                    submittedAt: new Date()
                };
            });

            if (!result) {
                return { success: false, error: 'Runner not found' };
            }

            return {
                success: true,
                verified: false,
                status: 'pending_review',
                kycStatus: result.kycStatus,
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

    // ADMIN METHODS
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

            if (!runner) {
                return null;
            }

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
                        rejectionReason: docs.nin?.rejectionReason
                    },
                    driverLicense: {
                        status: docs.driverLicense?.status || 'not_submitted',
                        verified: docs.driverLicense?.verified || false,
                        submittedAt: docs.driverLicense?.submittedAt,
                        documentPath: docs.driverLicense?.documentPath,
                        verifiedAt: docs.driverLicense?.verifiedAt,
                        verifiedBy: docs.driverLicense?.verifiedBy,
                        rejectedAt: docs.driverLicense?.rejectedAt,
                        rejectionReason: docs.driverLicense?.rejectionReason
                    }
                },
                biometrics: {
                    status: bio.status || 'not_submitted',
                    selfieVerified: bio.selfieVerified || false,
                    selfieImage: bio.selfieImage,
                    submittedAt: bio.submittedAt,
                    verifiedAt: bio.verifiedAt,
                    rejectedAt: bio.rejectedAt,
                    rejectionReason: bio.rejectionReason
                }
            };

        } catch (error) {
            console.error('Error fetching runner details:', error);
            throw error;
        }
    }

    async approveDocument(runnerId, documentType, adminId = 'admin') {
        const validTypes = ['nin', 'driverLicense', 'passport'];
        if (!validTypes.includes(documentType)) return { success: false, error: 'Invalid document type' };

        try {
            const result = await this._applyKycUpdate(runnerId, (runner) => {
                const doc = runner.verificationDocuments[documentType] || (runner.verificationDocuments[documentType] = {});
                doc.verified = true;
                doc.status = 'approved';
                doc.verifiedAt = new Date();
                doc.verifiedBy = adminId;
            });

            if (!result) return { success: false, error: 'Runner not found' };

            console.log('[approveDocument]', documentType, '→ kycStatus:', result.kycStatus, 'isVerifiedKyc:', result.isVerifiedKyc);
            return { success: true, kycStatus: result.kycStatus, isVerifiedKyc: result.isVerifiedKyc };
        } catch (error) {
            console.error('Error approving document:', error);
            return { success: false, error: error.message };
        }
    }

    async rejectDocument(runnerId, documentType, reason) {
        const validTypes = ['nin', 'driverLicense', 'passport'];
        if (!validTypes.includes(documentType)) return { success: false, error: 'Invalid document type' };

        try {
            const result = await this._applyKycUpdate(runnerId, (runner) => {
                const doc = runner.verificationDocuments[documentType] || (runner.verificationDocuments[documentType] = {});
                doc.verified = false;
                doc.status = 'rejected';
                doc.rejectedAt = new Date();
                doc.rejectionReason = reason;
            });

            if (!result) return { success: false, error: 'Runner not found' };

            return { success: true, kycStatus: result.kycStatus };
        } catch (error) {
            console.error('Error rejecting document:', error);
            return { success: false, error: error.message };
        }
    }

    async approveSelfie(runnerId, adminId = 'admin') {
        try {
            const result = await this._applyKycUpdate(runnerId, (runner) => {
                if (!runner.biometricVerification) runner.biometricVerification = {};
                runner.biometricVerification.selfieVerified = true;
                runner.biometricVerification.status = 'approved';
                runner.biometricVerification.verifiedAt = new Date();
                runner.biometricVerification.verifiedBy = adminId;
            });

            if (!result) return { success: false, error: 'Runner not found' };

            console.log('[approveSelfie] → kycStatus:', result.kycStatus, 'isVerifiedKyc:', result.isVerifiedKyc);
            return { success: true, kycStatus: result.kycStatus, isVerifiedKyc: result.isVerifiedKyc };
        } catch (error) {
            console.error('Error approving selfie:', error);
            return { success: false, error: error.message };
        }
    }

    async rejectSelfie(runnerId, reason) {
        try {
            const result = await this._applyKycUpdate(runnerId, (runner) => {
                if (!runner.biometricVerification) runner.biometricVerification = {};
                runner.biometricVerification.selfieVerified = false;
                runner.biometricVerification.status = 'rejected';
                runner.biometricVerification.rejectedAt = new Date();
                runner.biometricVerification.rejectionReason = reason;
            });

            if (!result) return { success: false, error: 'Runner not found' };

            return { success: true, kycStatus: result.kycStatus };
        } catch (error) {
            console.error('Error rejecting selfie:', error);
            return { success: false, error: error.message };
        }
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
}

module.exports = KYCService;