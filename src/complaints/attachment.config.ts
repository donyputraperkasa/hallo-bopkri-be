import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { extname, resolve } from 'path';
import { diskStorage, MulterError } from 'multer';
import type { Options } from 'multer';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

export function getUploadDirectory() {
  return resolve(process.env.UPLOAD_DIR ?? 'uploads');
}

export const attachmentUploadOptions: Options = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      const directory = getUploadDirectory();
      mkdirSync(directory, { recursive: true });
      callback(null, directory);
    },
    filename: (_request, file, callback) => {
      const safeExtension = extname(file.originalname).toLowerCase();
      callback(null, `${randomBytes(20).toString('hex')}${safeExtension}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    callback(null, true);
  },
};
