import { Pinpoint } from "aws-sdk";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { emailContent } from "./email";
const pinpoint = new Pinpoint();

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const TO_EMAIL: string = process.env.TO_EMAIL!;
  const FROM_EMAIL: string = process.env.FROM_EMAIL!;
  const applicationId: string = process.env.APP_ID!;
  const emailSubject: string = "Pinpoint Testing Email";

  const paramsForEmail = {
    ApplicationId: applicationId,
    MessageRequest: {
      Addresses: {
        [FROM_EMAIL]: { ChannelType: "EMAIL" },
      },
      MessageConfiguration: {
        EmailMessage: {
          SimpleEmail: {
            HtmlPart: {
              Charset: "UTF-8",
              Data: emailContent,
            },
            Subject: {
              Charset: "UTF-8",
              Data: emailSubject,
            },
          },
          FromAddress: TO_EMAIL,
        },
      },
    },
  };

  try {
    await pinpoint.sendMessages(paramsForEmail).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Email has been sent to your Customer",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error }),
    };
  }
};
