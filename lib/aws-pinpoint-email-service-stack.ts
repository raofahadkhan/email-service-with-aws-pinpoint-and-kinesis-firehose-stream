import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigwv2_integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as pinpoint from "aws-cdk-lib/aws-pinpoint";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as firehose from "aws-cdk-lib/aws-kinesisfirehose";
import { Construct } from "constructs";

export class AwsPinpointEmailServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const { service, stage } = props?.tags!;

    // ===============================================================================
    // S3: CREATED S3 BUCKET FOR SAVING PINPOINT EMAIL INSIGHTS DATA
    // ===============================================================================

    const pinpointEmailsInsightsBuckets = new s3.Bucket(
      this,
      `${service}-${stage}-pinpoint-email-bucket`,
      {
        bucketName: `${service}-${stage}-pinpoint-email-bucket`,
        versioned: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    // ===============================================================================
    // CREATED HTTP API FOR SENDING EMAILS THROUGH PINPOINT
    // ===============================================================================

    const pinpointEmailApi = new apigwv2.HttpApi(
      this,
      `${service}-${stage}-api`,
      {
        apiName: `${service}-${stage}-api`,
        description:
          "This api is responsible for sending emails with pinpoint.",
        corsPreflight: {
          allowHeaders: ["Content-Type"],
          allowMethods: [apigwv2.CorsHttpMethod.POST],
          allowCredentials: false,
          allowOrigins: ["*"],
        },
      }
    );

    // ===============================================================================
    // IAM: CREATED IAM POLICIES FOR PINPOINT AND KINESIS FIREHOSE STREAM
    // ===============================================================================

    const pinpoint_role = new iam.Role(
      this,
      `${service}-${stage}-pinpoint-role`,
      {
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal("pinpoint.amazonaws.com"),
          new iam.ServicePrincipal("lambda.amazonaws.com"),
          new iam.ServicePrincipal("firehose.amazonaws.com")
        ),

        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    pinpoint_role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "mobiletargeting:SendMessages",
          "firehose:PutRecord",
          "firehose:PutRecordBatch",
        ],
        resources: ["*"],
      })
    );

    pinpoint_role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: [pinpointEmailsInsightsBuckets.bucketArn],
      })
    );

    // ===============================================================================
    // CREATED A PINPOINT APP FOR SENDING EMAILS
    // ===============================================================================

    const pinpointEmailApp = new pinpoint.CfnApp(
      this,
      `${service}-${stage}-project`,
      {
        name: `${service}-${stage}-project`,
      }
    );

    // ===============================================================================
    // CREATED A PINPOINT EMAIL CHANNEL
    // ===============================================================================

    new pinpoint.CfnEmailChannel(
      this,
      `${service}-${stage}-pinpoint-email-channel`,
      {
        applicationId: pinpointEmailApp.ref,
        enabled: true,
        fromAddress: "raofahad046@gmail.com",
        identity:
          "arn:aws:ses:us-east-1:961322954791:identity/raofahad046@gmail.com",
        roleArn: pinpoint_role.roleArn,
      }
    );

    // ===============================================================================
    // DELIVERY STREAM: CREATED KINESIS FIREHOSE DELIVERY STREAM
    // ===============================================================================

    const firehoseStream = new firehose.CfnDeliveryStream(
      this,
      `${service}-${stage}-firehose-delivery-stream`,
      {
        deliveryStreamType: "DirectPut",
        extendedS3DestinationConfiguration: {
          bucketArn: pinpointEmailsInsightsBuckets.bucketArn,
          bufferingHints: {
            intervalInSeconds: 60,
            sizeInMBs: 50,
          },
          roleArn: pinpoint_role.roleArn,
        },
      }
    );

    // ===============================================================================
    // EVENT STREAM: CREATED PINPOINT EVENT STREAM TO SEND EVENTS TO KINESIS STREAM
    // ===============================================================================

    new pinpoint.CfnEventStream(
      this,
      `${service}-${stage}-pinpoint-event-stream`,
      {
        applicationId: pinpointEmailApp.ref,
        destinationStreamArn: firehoseStream.attrArn,
        roleArn: pinpoint_role.roleArn,
      }
    );

    // ===============================================================================
    // LAMBDA: CREATED LAMBDA FUNCTION FOR PINPOINT EMAIL SERVICE
    // ===============================================================================

    const pinpointSendEmailLambda = new lambda.Function(
      this,
      `${service}-${stage}-send-email-lambda`,
      {
        functionName: `${service}-${stage}-send-email-lambda`,
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "SendEmail.handler",
        role: pinpoint_role,
        environment: {
          FROM_EMAIL: "raofahad046@gmail.com",
          APP_ID: pinpointEmailApp.ref,
        },
      }
    );

    // ===============================================================================
    // CREATED HTTP API INTEGRATIONS WITH API-GATEWAY
    // ===============================================================================

    const pinpointSendEmailLambdaIntegration =
      new apigwv2_integrations.HttpLambdaIntegration(
        `${service}-${stage}-send-email-lambda-integration`,
        pinpointSendEmailLambda
      );

    // ===============================================================================
    // CREATED ROUTE FOR LAMBDA FUNCTION
    // ===============================================================================

    pinpointEmailApi.addRoutes({
      path: "/send-email",
      methods: [apigwv2.HttpMethod.POST],
      integration: pinpointSendEmailLambdaIntegration,
    });

    // ===============================================================================
    // OUTPUT STATEMENTS FOR OUTPUT URLS AND ARNS
    // ===============================================================================

    new cdk.CfnOutput(this, `${service}-${stage}-feedback-api-endpoint`, {
      value: pinpointEmailApi.url!,
    });
  }
}
