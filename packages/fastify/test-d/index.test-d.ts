import * as AWSXRay from "aws-xray-sdk-core";
import * as fastify from "fastify";
import { expectType } from "tsd";
import * as AWSXRayFastify from "../lib";

const app = fastify();

AWSXRayFastify.capture({ fastify: app, defaultName: "defaultName" });

app.get("/", function (req, res) {
  expectType<AWSXRay.Segment | undefined>(req.segment);
  res.send("Hello World!");
});
