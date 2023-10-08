import Core from "../Core.js";
import { S3Client } from "@aws-sdk/client-s3";

class AmazonAWS {
  private s3Client: S3Client;
  private core: Core;

  constructor(core: Core) {
    this.core = core;
    this.s3Client = new S3Client({
      credentials: this.getCredentials(),
      region: this.getRegion(),
    });
    this.core.getLogger().debug("AWS S3 Client is connected.");
  }

  public getS3Client() {
    return this.s3Client;
  }

  public getCredentials() {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    };
  }

  public getRegion() {
    return process.env.AWS_REGION;
  }

  public getS3Bucket() {
    return process.env.AWS_BUCKET_NAME;
  }
}
export default AmazonAWS;
