import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSmsOtp(mobile: string, otp: string): Promise<void> {
  await client.messages.create({
    body: `Your Lifelogix verification code is ${otp}. It expires in 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: mobile, // must be in E.164 format, e.g. +919876543210
  });
}