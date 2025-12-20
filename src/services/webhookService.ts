import { db } from '../execution/db_client';
import axios from 'axios';
import crypto from 'crypto';

export interface WebhookEvent {
    event: string;
    tenant_id: number;
    data: any;
    timestamp: Date;
}

// b61 - Webhook notification service
export class WebhookService {
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_DELAY_MS = 5000;

    // Trigger webhooks for a specific event
    static async trigger(event: string, tenantId: number, data: any): Promise<void> {
        try {
            // Get active webhooks for this tenant and event
            const webhooks = await db.query(`
        SELECT id, url, secret, events
        FROM webhooks
        WHERE tenant_id = $1 
          AND is_active = TRUE
          AND events ? $2
      `, [tenantId, event]);

            for (const webhook of webhooks) {
                // Don't await - fire and forget for performance
                this.sendWebhook(webhook, event, tenantId, data).catch(err => {
                    console.error(`Webhook ${webhook.id} failed:`, err.message);
                });
            }
        } catch (error) {
            console.error('Webhook trigger error:', error);
        }
    }

    // Send individual webhook with retry logic
    private static async sendWebhook(
        webhook: any,
        event: string,
        tenantId: number,
        data: any,
        attempt: number = 1
    ): Promise<void> {
        const payload: WebhookEvent = {
            event,
            tenant_id: tenantId,
            data,
            timestamp: new Date()
        };

        const payloadString = JSON.stringify(payload);

        // Generate signature if secret is set
        const signature = webhook.secret
            ? crypto.createHmac('sha256', webhook.secret).update(payloadString).digest('hex')
            : null;

        try {
            await axios.post(webhook.url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': event,
                    'X-Webhook-Timestamp': payload.timestamp.toISOString(),
                    ...(signature && { 'X-Webhook-Signature': `sha256=${signature}` })
                },
                timeout: 10000
            });

            // Update last triggered and reset failure count
            await db.query(
                'UPDATE webhooks SET last_triggered_at = NOW(), failure_count = 0 WHERE id = $1',
                [webhook.id]
            );
        } catch (error: any) {
            console.error(`Webhook ${webhook.id} attempt ${attempt} failed:`, error.message);

            // Increment failure count
            await db.query(
                'UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1',
                [webhook.id]
            );

            // Retry with exponential backoff
            if (attempt < this.MAX_RETRIES) {
                setTimeout(() => {
                    this.sendWebhook(webhook, event, tenantId, data, attempt + 1);
                }, this.RETRY_DELAY_MS * attempt);
            } else {
                // Disable webhook if too many failures
                const failureCheck = await db.queryOne(
                    'SELECT failure_count FROM webhooks WHERE id = $1',
                    [webhook.id]
                );
                if (failureCheck && failureCheck.failure_count >= 10) {
                    await db.query(
                        'UPDATE webhooks SET is_active = FALSE WHERE id = $1',
                        [webhook.id]
                    );
                    console.warn(`Webhook ${webhook.id} disabled due to repeated failures`);
                }
            }
        }
    }

    // Event types
    static readonly Events = {
        CONTENT_CREATED: 'content.created',
        CONTENT_COMPLETED: 'content.completed',
        CONTENT_FAILED: 'content.failed',
        CONTENT_PUBLISHED: 'content.published',
        TENANT_CREATED: 'tenant.created',
        TENANT_UPDATED: 'tenant.updated',
    };
}

// Helper to trigger common events
export const triggerWebhook = WebhookService.trigger.bind(WebhookService);
