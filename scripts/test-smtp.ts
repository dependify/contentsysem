import EmailService from '../src/services/emailService';
import { db } from '../src/execution/db_client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSmtp() {
    console.log('Starting SMTP test...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USER:', process.env.SMTP_USER);

    // @ts-ignore
    const emailService = new EmailService(db);

    try {
        console.log('Attempting to send test email...');
        const success = await emailService.send(
            'admin@dependifyllc.com.ng',
            'welcome',
            {
                name: 'Admin',
                getStartedUrl: 'http://localhost:3000/onboarding',
                docsUrl: 'http://localhost:3000/docs'
            }
        );

        if (success) {
            console.log('✅ Test email sent successfully!');
        } else {
            console.error('❌ Failed to send test email. Check transporter configuration.');
        }
    } catch (error) {
        console.error('❌ Error during SMTP test:', error);
    } finally {
        await db.close();
        process.exit();
    }
}

testSmtp();
