import * as blurhash from "blurhash";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import Core from "../Core.js";
import crypto from "crypto";
import sharp from "sharp";

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

  public async uploadFile(file: any) {
    const fileKey = crypto.randomBytes(32).toString("hex");

    const { data: fileBuffer, info: fileInfo } = await sharp(file.buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const command = new PutObjectCommand({
      Bucket: this.core.getAWS().getS3Bucket(),
      Key: "upload/" + fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await this.core.getAWS().getS3Client().send(command);

    const upload = await this.core.getPrisma().upload.create({
      data: {
        name: fileKey,
        height: fileInfo.height,
        width: fileInfo.width,
        hash: blurhash.encode(
          new Uint8ClampedArray(fileBuffer),
          fileInfo.width,
          fileInfo.height,
          4,
          4
        ),
      },
    });
    return upload;
  }
}
export default AmazonAWS;
