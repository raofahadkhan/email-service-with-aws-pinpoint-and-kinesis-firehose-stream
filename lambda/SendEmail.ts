const AWS = require("aws-sdk");
const ses = new AWS.SES();
import { SendEmailRequest } from "aws-sdk/clients/ses";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
const dynamodb = new AWS.DynamoDB.DocumentClient();
// import { v4 as uuidv4 } from "uuid";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Body is missing" }),
    };
  }

  const requestBody = JSON.parse(event.body);
  //   const user_id: string = requestBody.user_id;
  //   const feedback_id: string = uuidv4();
  //   const feedback_message: string = requestBody.feedback;
  const TO_EMAIL: string = process.env.TO_EMAIL!;
  const FROM_EMAIL: string = process.env.FROM_EMAIL!;

  const isValidEmail = new RegExp(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);

  //   if (!user_id.match(isValidEmail)) {
  //     return {
  //       statusCode: 400,
  //       body: JSON.stringify({ message: "email is not valid" }),
  //     };
  //   }

  //   const params = {
  //     TableName: process.env.TABLE_NAME,
  //     Item: {
  //       user_id: user_id,
  //       feedback_id: feedback_id,
  //       feedback_message: feedback_message,
  //     },
  //   };

  const sesParams: SendEmailRequest = {
    Destination: {
      ToAddresses: [TO_EMAIL],
    },
    Message: {
      Body: {
        Html: {
          Data: `
          <!DOCTYPE html>
          <html lang="en">
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
    .card {
      box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
      transition: 0.3s;
      width: 80%;
    }
    
    .card:hover {
      box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2);
    }
    
    .container {
      padding: 2px 16px;
    }
    </style>
    </head>
    <body>
    <div class="card">
      <div class="container">
      <h1>Feedback From Customer</h1>
      <p>Feedback Message :<a src="https://www.google.com">Fahad's Profile Link</a></p> 
      </div>
    </div>
    </body>
          </html>
          `,
        },
      },
      Subject: {
        Data: "Feed back Message from Customer",
      },
    },
    Source: FROM_EMAIL,
  };

  try {
    // await dynamodb.put(params).promise();
    await ses.sendEmail(sesParams).promise();
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
