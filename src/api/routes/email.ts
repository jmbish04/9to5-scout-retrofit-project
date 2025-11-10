/**
 * @module src/api/routes/email.ts
 * @description
 * Routes for the email domain.
 */
import { Hono } from "hono";
import { EmailReportingService } from "../../domains/email/services/email-reporting.service";
import emailClassify from "./email.classify";
import emailDashboard from "./email.dashboard";

const email = new Hono();

email.post("/report", async (c) => {
  // Accept userId from query or JSON body
  let userId = c.req.query("userId");
  if (!userId) {
    try {
      const body = await c.req.json<{ userId?: string }>();
      userId = body?.userId;
    } catch (_) {
      // ignore parse errors
    }
  }

  if (!userId) {
    return c.json({ error: "Missing required userId" }, 400);
  }

  const service = new EmailReportingService(c.env as unknown as any);
  await service.sendDailySummary(userId);
  return c.json({ message: "Daily email summary sent.", userId });
});

// Email classification routes
email.route("/", emailClassify);

// Email dashboard routes
email.route("/", emailDashboard);

export default email;
