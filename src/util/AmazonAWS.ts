import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import crypto from "crypto";
import sharp from "sharp";
import Core from "../Core.js";

class AmazonAWS {
  private s3Client: S3Client;
  private core: Core;

  constructor(core: Core) {
    this.core = core;
    this.s3Client = new S3Client({
      credentials: this.getCredentials(),
      region: this.getRegion(),
      endpoint: "https://cdn2.buildtheearth.net",
      forcePathStyle: true,
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

  public getS3Bucket(_static: boolean) {
    if (_static) {
      return process.env.AWS_STATIC_BUCKET_NAME;
    }
    return process.env.AWS_UPLOAD_BUCKET_NAME;
  }

  public async uploadFile(file: any) {
    const fileKey = crypto.randomBytes(32).toString("hex");

    const { data: fileBuffer, info: fileInfo } = await sharp(file.buffer)
      .ensureAlpha()
      .resize(1920, 1080, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const command = new PutObjectCommand({
      Bucket: this.core.getAWS().getS3Bucket(false),
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await this.core.getAWS().getS3Client().send(command);

    const upload = await this.core.getPrisma().upload.create({
      data: {
        name: fileKey,
        height: fileInfo.height,
        width: fileInfo.width,
        hash: /*blurhash.encode(
          new Uint8ClampedArray(fileBuffer),
          fileInfo.width,
          fileInfo.height,
          4,
          4
        ),*/ "",
      },
    });
    return upload;
  }

  public async getFile(bucket: string, fileKey: string) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    });
    return await this.core.getAWS().getS3Client().send(command);
  }
}
export default AmazonAWS;
