import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import "dotenv/config";

const client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

export default {
  async auploadToS3(imageData, bucketName = "movie-project-images", key) {
    if (!key) throw new Error("An S3 object key is required.");
    return client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: `${key}.jpg`,
      Body: imageData,
      ContentType: "image/jpeg",
    }));
  },
};
