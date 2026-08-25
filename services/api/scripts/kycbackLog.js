const mongoose = require('mongoose');
const Runner = require('../models/Runner');
const KYCServiceExport = require('../services/kycService');

const DATABASE_URL = 
"mongodb+srv://sendrey:sendrey@cluster0.6h2uo87.mongodb.net/sendrey-server-production?retryWrites=true&w=majority";

const kycService = typeof KYCServiceExport === 'function'
    ? new KYCServiceExport()
    : KYCServiceExport;

async function kycBackLog() {
    await mongoose.connect(DATABASE_URL);

    const runners = await Runner.find({ role: 'runner' });
    for (const runner of runners) {
        const correct = kycService._computeStatus(runner);
        if (runner.kycStatus !== correct) {
            console.log(`${runner.email}: ${runner.kycStatus} → ${correct}`);
            runner.kycStatus = correct;
            runner.isVerifiedKyc = correct === 'approved_full';
            await runner.save();
        }
        console.log(`${runner.email}: Corrected - ${correct}`);
    }

    process.exit(0);
}

kycBackLog().catch(err => { console.error(err); process.exit(1); });