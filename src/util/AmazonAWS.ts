import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import crypto from 'crypto';
import { getPlaiceholder } from 'plaiceholder';
import sharp from 'sharp';
import Core from '../Core.js';

class AmazonAWS {
	private s3Client: S3Client;
	private core: Core;

	constructor(core: Core) {
		this.core = core;
		this.s3Client = new S3Client({
			credentials: this.getCredentials(),
			region: this.getRegion(),
			endpoint: 'https://cdn.buildtheearth.net',
			forcePathStyle: true,
		});
		this.core.getLogger().debug('AWS S3 Client is connected.');
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

	public async uploadFile(file: any, opts?: any) {
		const fileKey = crypto.randomBytes(32).toString('hex');

		const { data: fileBuffer, info: fileInfo } = await sharp(file.buffer)
			.ensureAlpha()
			.resize(1920, 1080, { fit: 'cover' })
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
				hash: (await getPlaiceholder(file.buffer)).base64,
				// hash: "",
				...opts,
			},
		});
		return upload;
	}

	public async deleteFile(bucket: string, fileKey: string) {
		const upload = await this.core.getPrisma().upload.delete({ where: { id: fileKey } });
		const command = new DeleteObjectCommand({
			Bucket: bucket,
			Key: upload.name,
		});
		await this.core.getAWS().getS3Client().send(command);

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
