import type { Env } from './env';
import { runDailyJobMonitoring } from './monitoring';
import { generateEmailInsights, sendInsightsEmail } from './email';

export async function handleScheduledEvent(env: Env): Promise<void> {
  console.log('Running scheduled job monitoring and email insights...');

  try {
    console.log('Starting daily job monitoring...');
    const monitoringResult = await runDailyJobMonitoring(env);
    console.log('Daily monitoring completed:', monitoringResult);

    console.log('Starting email insights...');

    const result = await env.DB.prepare(`
      SELECT * FROM email_configs
      WHERE enabled = 1
      AND (last_sent_at IS NULL OR
           datetime(last_sent_at, '+' || frequency_hours || ' hours') <= datetime('now'))
    `).all();

    const configs = result.results || [];
    console.log(`Found ${configs.length} email configs ready to send`);

    for (const config of configs) {
      try {
        const insights = await generateEmailInsights(env, config);
        const emailSent = await sendInsightsEmail(insights, config, env);

        if (emailSent) {
          await env.DB.prepare(`
            UPDATE email_configs SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?
          `).bind(config.id).run();

          console.log(`Email insights sent successfully to ${config.recipient_email}`);
        } else {
          console.error(`Failed to send email insights to ${config.recipient_email}`);
        }
      } catch (error) {
        console.error(`Error processing email config ${config.id}:`, error);
      }
    }

    console.log('Scheduled task completed successfully');
  } catch (error) {
    console.error('Error in scheduled task:', error);
  }
}
