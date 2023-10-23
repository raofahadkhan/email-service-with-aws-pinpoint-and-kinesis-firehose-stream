import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as apigwv2_integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as pinpoint from "aws-cdk-lib/aws-pinpoint";
import * as pinpointemail from "aws-cdk-lib/aws-pinpointemail";

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

    const pinpointEmailApp = new pinpoint.CfnApp(this, `${service}-${stage}-project`, {
      name: `${service}-${stage}-project`,
    });

    const emailChannel = new pinpoint.CfnEmailChannel(this, `${service}-${stage}-email-channel`, {
      applicationId: pinpointEmailApp.ref,
      enabled: true,
      fromAddress: "raofahad046@gmail.com",
      identity: "arn:aws:ses:us-east-1:961322954791:identity/raofahad046@gmail.com",
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

    const pinpointSendEmailLambdaIntegration = new apigwv2_integrations.HttpLambdaIntegration(
      `${service}-${stage}-send-email-lambda-integration`,
      pinpointSendEmailLambda
    );

    pinpointEmailApi.addRoutes({
      path: "/",
      methods: [apigwv2.HttpMethod.POST],
      integration: pinpointSendEmailLambdaIntegration,
    });

    new cdk.CfnOutput(this, `${service}-${stage}-feedback-api-endpoint`, {
      value: pinpointEmailApi.url!,
    });
  }
}
