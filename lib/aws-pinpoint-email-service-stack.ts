import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export class AwsPinpointEmailServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const { service, stage } = props?.tags!;

    const pinpointEmailsInsightsBuckets = new s3.Bucket(this, `${service}-${stage}-bucket`, {
      bucketName: `${service}-${stage}-bucket`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const pinpointEmailApi = new apigwv2.HttpApi(this, `${service}-${stage}-api`, {
      apiName: `${service}-${stage}-api`,
      description: "This api is responsible for sending emails with pinpoint.",
      corsPreflight: {
        allowHeaders: ["Content-Type"],
        allowMethods: [apigwv2.CorsHttpMethod.POST],
        allowCredentials: false,
        allowOrigins: ["*"],
      },
    });

    const pinpointSendEmailLambda = new lambda.Function(
      this,
      `${service}-${stage}-send-email-lambda`,
      {
        functionName: `${service}-${stage}-send-email-lambda`,
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "SendEmail.handler",
        environment: {
          FROM_EMAIL: "raofahad046@gmail.com",
          TO_EMAIL: "fahad.rao@livecart.ai",
        },
      }
    );

    pinpointSendEmailLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ses:SendEmail", "ses:SendRawEmail", "ses:SendTemplatedEmail"],
        resources: ["*"],
      })
    );
  }
}
