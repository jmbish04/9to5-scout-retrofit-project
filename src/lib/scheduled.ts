import type { Env } from "../domains/config/env/env.config";
import { runDailyJobMonitoring } from "./monitoring";
// TODO: Implement email insights functions in email service
// import { generateEmailInsights, sendInsightsEmail } from '../domains/integrations/email/email.service';
import {
  handleCompanyBenefitsCron,
  handleStatsRollupCron,
} from "../routes/company-benefits";

type ScheduledEvent = { cron?: string };

async function runMonitoringAndEmail(env: Env): Promise<void> {
  console.log("Starting daily job monitoring...");
  const monitoringResult = await runDailyJobMonitoring(env);
  console.log("Daily monitoring completed:", monitoringResult);

  console.log("Starting email insights...");

  const configsQuery = `
    SELECT * 
    FROM email_configs
    WHERE 
      enabled = 1
      AND (
        last_sent_at IS NULL 
        OR datetime(last_sent_at, '+' || frequency_hours || ' hours') <= datetime('now'))
  `;

  const result = await env.DB.prepare(configsQuery).all();

  const configs = result.results || [];
  console.log(`Found ${configs.length} email configs ready to send`);

  for (const config of configs) {
    try {
      // TODO: Implement email insights functions
      // const insights = await generateEmailInsights(env, config);
      // const emailSent = await sendInsightsEmail(insights, config, env);

      // if (emailSent) {
      //   const updateQuery =
      //     "UPDATE email_configs SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?";
      //   await env.DB.prepare(updateQuery).bind(config.id).run();

      //   console.log(
      //     `Email insights sent successfully to ${config.recipient_email}`
      //   );
      // } else {
      //   console.error(
      //     `Failed to send email insights to ${config.recipient_email}`
      //   );
      // }

      console.log(
        `Skipping email config ${config.id} - email insights not implemented yet`
      );
    } catch (error) {
      console.error(`Error processing email config ${config.id}:`, error);
    }
  }
}

export async function handleScheduledEvent(
  env: Env,
  event?: ScheduledEvent
): Promise<void> {
  const cron = event?.cron;

  try {
    if (cron === "0 8 * * *") {
      console.log("Running company benefits nightly cron");
      await handleCompanyBenefitsCron(env);
      return;
    }

    if (cron === "0 9 * * *") {
      console.log("Running benefits stats rollup cron");
      await handleStatsRollupCron(env);
      return;
    }

    console.log("Running monitoring + email scheduled task");
    await runMonitoringAndEmail(env);
  } catch (error) {
    console.error("Error in scheduled task:", error);
  }
}
