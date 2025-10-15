import type { Env } from './env';
import { handleEmailReceived } from '../routes/email';

export async function processEmailEvent(message: ForwardableEmailMessage, env: Env): Promise<void> {
  try {
    console.log(`Email received from: ${message.from}, to: ${message.to}`);

    const forwardAddress =
      env.FORWARD_EMAIL_ADDRESS || env.NOTIFICATION_EMAIL_ADDRESS || 'justin@126colby.com';

    if (forwardAddress) {
      try {
        await message.forward(forwardAddress);
        console.log(`Email forwarded to ${forwardAddress}`);
      } catch (forwardError) {
        console.error('Failed to forward email:', forwardError);
      }
    }

    const request = new Request('http://localhost/email-ingestion', {
      method: 'POST',
      headers: message.headers,
      body: message.raw,
    });

    const response = await handleEmailReceived(request, env);

    if (!response.ok) {
      const errorBody = await response.text();
      message.setReject(`Email processing failed: ${errorBody}`);
      console.error(`Failed to process email: ${errorBody}`);
    }
  } catch (error) {
    console.error('Error in email handler:', error);
    message.setReject('An internal error occurred during email processing.');
  }
}
