import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { z } from 'zod';
import type { Response } from 'express';
export const providerImageInput = z
  .object({
    expectedVersion: z.coerce.number().int().positive(),
    alt: z.string().trim().min(1).max(240),
  })
  .strict();
export async function decodeProviderImage(file?: Express.Multer.File) {
  if (
    !file?.buffer.length ||
    file.buffer.length > 4 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
  )
    throw new BadRequestException('Choose a JPG, PNG or WebP image up to 4 MB.');
  try {
    const decoder = sharp(file.buffer, { limitInputPixels: 20000000, animated: false });
    const metadata = await decoder.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
      throw new Error('Unsupported image');
    return await decoder
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 86 })
      .toBuffer();
  } catch {
    throw new BadRequestException(
      'Image could not be decoded. Choose a still JPG, PNG or WebP image.',
    );
  }
}
export function omitProviderImage<T extends { image_data: unknown }>(row: T) {
  const { image_data, ...safe } = row;
  void image_data;
  return safe;
}
export function sendProviderImage(
  response: Response,
  image: { image_data: Buffer | null; image_revision: string | null },
) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.type('image/jpeg').send(image.image_data);
}
