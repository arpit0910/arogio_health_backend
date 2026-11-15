"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerImageInput = void 0;
exports.decodeProviderImage = decodeProviderImage;
exports.omitProviderImage = omitProviderImage;
exports.sendProviderImage = sendProviderImage;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const zod_1 = require("zod");
exports.providerImageInput = zod_1.z
    .object({
    expectedVersion: zod_1.z.coerce.number().int().positive(),
    alt: zod_1.z.string().trim().min(1).max(240),
})
    .strict();
async function decodeProviderImage(file) {
    if (!file?.buffer.length ||
        file.buffer.length > 4 * 1024 * 1024 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
        throw new common_1.BadRequestException('Choose a JPG, PNG or WebP image up to 4 MB.');
    try {
        const decoder = (0, sharp_1.default)(file.buffer, { limitInputPixels: 20000000, animated: false });
        const metadata = await decoder.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
            throw new Error('Unsupported image');
        return await decoder
            .rotate()
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .flatten({ background: '#ffffff' })
            .jpeg({ quality: 86 })
            .toBuffer();
    }
    catch {
        throw new common_1.BadRequestException('Image could not be decoded. Choose a still JPG, PNG or WebP image.');
    }
}
function omitProviderImage(row) {
    const { image_data, ...safe } = row;
    void image_data;
    return safe;
}
function sendProviderImage(response, image) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.type('image/jpeg').send(image.image_data);
}
//# sourceMappingURL=provider-image.js.map