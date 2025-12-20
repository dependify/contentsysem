// Email Notification Service
import nodemailer from 'nodemailer';
import { Pool } from 'pg';

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
}

interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

// Email notification types
export type NotificationType =
    | 'content_ready'
    | 'content_failed'
    | 'workflow_complete'
    | 'daily_summary'
    | 'welcome'
    | 'password_reset';

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private db: Pool;
    private config: EmailConfig;

    constructor(db: Pool) {
        this.db = db;
        this.config = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || '',
            },
            from: process.env.EMAIL_FROM || 'ContentSys <noreply@contentsys.io>',
        };

        this.initTransporter();
    }

    private initTransporter() {
        if (!this.config.auth.user || !this.config.auth.pass) {
            console.warn('Email service not configured: missing SMTP credentials');
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: this.config.host,
            port: this.config.port,
            secure: this.config.secure,
            auth: this.config.auth,
        });
    }

    private getTemplate(type: NotificationType, data: Record<string, any>): EmailTemplate {
        const templates: Record<NotificationType, () => EmailTemplate> = {
            content_ready: () => ({
                subject: `✅ Content Ready: "${data.title}"`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Content Ready for Review</h1>
            <p>Your content "<strong>${data.title}</strong>" has been generated and is ready for review.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Tenant:</strong> ${data.tenantName}</p>
              <p style="margin: 8px 0 0;"><strong>Word Count:</strong> ${data.wordCount || 'N/A'}</p>
              <p style="margin: 8px 0 0;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
              Review Content
            </a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              This is an automated message from ContentSys.
            </p>
          </div>
        `,
                text: `Content Ready: "${data.title}"\n\nYour content has been generated and is ready for review.\n\nTenant: ${data.tenantName}\nReview URL: ${data.reviewUrl}`,
            }),

            content_failed: () => ({
                subject: `❌ Content Failed: "${data.title}"`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Content Generation Failed</h1>
            <p>Unfortunately, there was an error generating your content "<strong>${data.title}</strong>".</p>
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #dc2626;"><strong>Error:</strong></p>
              <p style="margin: 8px 0 0;">${data.error || 'Unknown error occurred'}</p>
            </div>
            <p>You can retry the content generation or contact support if the issue persists.</p>
            <a href="${data.retryUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
              Retry Generation
            </a>
          </div>
        `,
                text: `Content Failed: "${data.title}"\n\nError: ${data.error}\n\nRetry URL: ${data.retryUrl}`,
            }),

            workflow_complete: () => ({
                subject: `🎉 Workflow Complete: ${data.count} items processed`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Workflow Complete</h1>
            <p>Your batch workflow has completed processing.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Total Processed:</strong> ${data.count}</p>
              <p style="margin: 8px 0 0;"><strong>Successful:</strong> ${data.successful}</p>
              <p style="margin: 8px 0 0;"><strong>Failed:</strong> ${data.failed}</p>
              <p style="margin: 8px 0 0;"><strong>Duration:</strong> ${data.duration}</p>
            </div>
            <a href="${data.queueUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
              View Queue
            </a>
          </div>
        `,
                text: `Workflow Complete\n\nTotal: ${data.count}\nSuccessful: ${data.successful}\nFailed: ${data.failed}`,
            }),

            daily_summary: () => ({
                subject: `📊 Daily Summary - ${new Date().toLocaleDateString()}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Daily Content Summary</h1>
            <p>Here's your content activity for today:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px;">Content Stats</h3>
              <table style="width: 100%;">
                <tr><td>Generated</td><td style="text-align: right;"><strong>${data.generated || 0}</strong></td></tr>
                <tr><td>Published</td><td style="text-align: right;"><strong>${data.published || 0}</strong></td></tr>
                <tr><td>Pending</td><td style="text-align: right;"><strong>${data.pending || 0}</strong></td></tr>
                <tr><td>Failed</td><td style="text-align: right;"><strong>${data.failed || 0}</strong></td></tr>
              </table>
            </div>
            ${data.scheduledTomorrow?.length > 0 ? `
              <h3>Scheduled for Tomorrow</h3>
              <ul>
                ${data.scheduledTomorrow.map((item: any) => `<li>${item.title}</li>`).join('')}
              </ul>
            ` : ''}
            <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
              View Dashboard
            </a>
          </div>
        `,
                text: `Daily Summary\n\nGenerated: ${data.generated}\nPublished: ${data.published}\nPending: ${data.pending}\nFailed: ${data.failed}`,
            }),

            welcome: () => ({
                subject: '👋 Welcome to ContentSys!',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Welcome to ContentSys!</h1>
            <p>Hi ${data.name},</p>
            <p>Thank you for joining ContentSys! We're excited to help you create amazing AI-powered content.</p>
            <h2>Getting Started</h2>
            <ol>
              <li>Create your first tenant for a WordPress site</li>
              <li>Configure your brand voice and ICP</li>
              <li>Add content topics to the queue</li>
              <li>Watch the AI generate high-quality content!</li>
            </ol>
            <a href="${data.getStartedUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
              Get Started
            </a>
            <p style="color: #6b7280; margin-top: 30px;">
              Need help? Check out our <a href="${data.docsUrl}">documentation</a> or contact support.
            </p>
          </div>
        `,
                text: `Welcome to ContentSys!\n\nHi ${data.name},\n\nThank you for joining ContentSys!\n\nGet Started: ${data.getStartedUrl}`,
            }),

            password_reset: () => ({
                subject: '🔑 Reset Your Password',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Reset Your Password</h1>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
            <p style="color: #6b7280; font-size: 12px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
                text: `Reset Your Password\n\nClick here to reset: ${data.resetUrl}\n\nThis link expires in 1 hour.`,
            }),
        };

        return templates[type]();
    }

    async send(
        to: string,
        type: NotificationType,
        data: Record<string, any>
    ): Promise<boolean> {
        if (!this.transporter) {
            console.warn('Email not sent: transporter not configured');
            return false;
        }

        try {
            const template = this.getTemplate(type, data);

            await this.transporter.sendMail({
                from: this.config.from,
                to,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });

            // Log the email
            await this.logEmail(to, type, true);
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            await this.logEmail(to, type, false, (error as Error).message);
            return false;
        }
    }

    private async logEmail(
        to: string,
        type: string,
        success: boolean,
        error?: string
    ) {
        try {
            await this.db.query(
                `INSERT INTO email_logs (recipient, type, success, error, sent_at)
         VALUES ($1, $2, $3, $4, NOW())`,
                [to, type, success, error]
            );
        } catch (err) {
            console.error('Failed to log email:', err);
        }
    }

    // Notification methods
    async notifyContentReady(userId: number, content: any) {
        const user = await this.getUserEmail(userId);
        if (!user) return;

        await this.send(user.email, 'content_ready', {
            title: content.title || content.keyword,
            tenantName: content.tenant_name,
            wordCount: content.word_count,
            reviewUrl: `${process.env.APP_URL}/content/${content.id}`,
        });
    }

    async notifyContentFailed(userId: number, content: any, error: string) {
        const user = await this.getUserEmail(userId);
        if (!user) return;

        await this.send(user.email, 'content_failed', {
            title: content.title || content.keyword,
            error,
            retryUrl: `${process.env.APP_URL}/content/${content.id}`,
        });
    }

    async sendDailySummary(userId: number, stats: any) {
        const user = await this.getUserEmail(userId);
        if (!user) return;

        await this.send(user.email, 'daily_summary', {
            ...stats,
            dashboardUrl: `${process.env.APP_URL}/dashboard`,
        });
    }

    async sendWelcome(email: string, name: string) {
        await this.send(email, 'welcome', {
            name,
            getStartedUrl: `${process.env.APP_URL}/onboarding`,
            docsUrl: `${process.env.APP_URL}/docs`,
        });
    }

    async sendPasswordReset(email: string, token: string) {
        await this.send(email, 'password_reset', {
            resetUrl: `${process.env.APP_URL}/reset-password?token=${token}`,
        });
    }

    private async getUserEmail(userId: number): Promise<{ email: string } | null> {
        try {
            const result = await this.db.query(
                'SELECT email FROM users WHERE id = $1',
                [userId]
            );
            return result.rows[0] || null;
        } catch {
            return null;
        }
    }
}

export default EmailService;
