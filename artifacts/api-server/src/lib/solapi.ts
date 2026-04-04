import { logger } from "./logger";

interface AlimtalkOptions {
  phone: string;
  name: string;
  liveTitle: string;
  scheduledAt: Date | null;
}

export async function sendKakaoAlimtalk(options: AlimtalkOptions): Promise<void> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const senderKey = process.env.SOLAPI_SENDER_KEY;
  const templateId = process.env.SOLAPI_TEMPLATE_ID;
  const senderPhone = process.env.SOLAPI_SENDER_PHONE;

  if (!apiKey || !apiSecret || !senderKey || !templateId || !senderPhone) {
    logger.warn(
      "Solapi environment variables not set (SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_KEY, SOLAPI_TEMPLATE_ID, SOLAPI_SENDER_PHONE). Skipping KakaoTalk notification.",
    );
    return;
  }

  try {
    const { SolapiMessageService } = await import("solapi");

    const messageService = new SolapiMessageService(apiKey, apiSecret);

    const scheduledAtStr = options.scheduledAt
      ? options.scheduledAt.toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "미정";

    await messageService.send({
      to: options.phone,
      from: senderPhone,
      kakaoOptions: {
        pfId: senderKey,
        templateId: templateId,
        variables: {
          "#{이름}": options.name,
          "#{라이브제목}": options.liveTitle,
          "#{일시}": scheduledAtStr,
        },
      },
    });

    logger.info({ phone: options.phone }, "KakaoTalk alimtalk sent successfully");
  } catch (error) {
    logger.error({ error, phone: options.phone }, "Failed to send KakaoTalk alimtalk");
    throw error;
  }
}
