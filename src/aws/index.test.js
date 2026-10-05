import test from "node:test";
import assert from "node:assert/strict";
import aws from "./index.js";

test("S3 upload requires an object key", async () => {
  await assert.rejects(() => aws.auploadToS3(Buffer.from("image")), {
    message: "An S3 object key is required.",
  });
});
