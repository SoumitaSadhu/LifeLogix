import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSmsOtp(mobile: string, otp: string): Promise<void> {
  if (process.env.OTP_DELIVERY === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Console OTP delivery is disabled in production");
    }

    console.info(`[development OTP] ${mobile}: ${otp}`);
    return;
  }

  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("TWILIO_SID and TWILIO_AUTH_TOKEN must be configured");
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new Error("TWILIO_PHONE_NUMBER is not configured");
  }

  await client.messages.create({
    body: `Your Lifelogix verification code is ${otp}. It expires in 5 minutes.`,
    from,
    to: mobile, // must be in E.164 format, e.g. +919876543210
  });
  
}