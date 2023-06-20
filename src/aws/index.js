import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const accessKeyId = process.env.AWS_ACCESS_KEY || "";
const secretAccessKey = process.env.AWS_SECRET_KEY || "";

const params = {
  region: "eu-central-1",
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
};

export default {
  s3Client: null,
  initAws() {
    const client = new S3Client(params);
    this.s3Client = client;
  },
  async auploadToS3(imageData, bucketName = "movie-project-images", key) {
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key + ".jpg",
      Body: imageData,
    });

    try {
      const response = await this.s3Client.send(putObjectCommand);
      return response;
    } catch (error) {
      console.error("Error uploading image to S3:", error);
      throw error;
    }
  },
};
