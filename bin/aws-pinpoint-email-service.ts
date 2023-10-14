#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsPinpointEmailServiceStack } from "../lib/aws-pinpoint-email-service-stack";

const service = "pinpoint-email-service";
let stage;
const app = new cdk.App();

stage = "main";
new AwsPinpointEmailServiceStack(app, `${service}-${stage}`, {
  tags: {
    service,
    stage,
  },
});

stage = "dev";
new AwsPinpointEmailServiceStack(app, `${service}-${stage}`, {
  tags: {
    service,
    stage,
  },
});
