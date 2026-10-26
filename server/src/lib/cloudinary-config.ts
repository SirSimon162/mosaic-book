import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import environment from "../config/env.js";
import AppError from "./http-error.js";
import { Status } from "./http-code.js";
import { allowedUploadExtensions } from "../modules/source/source.types.js";

cloudinary.config({
  cloud_name: environment.CLOUDINARY_CLOUD_NAME,
  api_key: environment.CLOUDINARY_API_KEY,
  api_secret: environment.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const extension = file.originalname.split(".").pop()?.toLowerCase();
    if (!extension || !allowedUploadExtensions.includes(extension)) {
      callback(new AppError("Unsupported file", Status.BAD_REQUEST));
      return;
    }
    callback(null, true);
  },
});

function saveUpload(
  file: Express.Multer.File,
): Promise<{
  secureUrl: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  originalname: string;
}> {
  if (!file.buffer) {
    return Promise.reject(new AppError("File is required", Status.BAD_REQUEST));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "mosaic-sources",
        resource_type: "raw",
        allowed_formats: [...allowedUploadExtensions],
        public_id: `file-${Date.now()}`,
      },
      (
        error: unknown,
        result:
          | {
              secure_url?: string;
              public_id?: string;
              resource_type?: string;
            }
          | undefined,
      ) => {
        if (
          error ||
          !result?.secure_url ||
          !result.public_id ||
          !result.resource_type
        ) {
          reject(
            error ??
              new AppError("Upload failed", Status.INTERNAL_SERVER_ERROR),
          );
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          bytes: file.buffer.length,
          originalname: file.originalname,
        });
      },
    );
    stream.end(file.buffer);
  });
}

function publicIdFromUrl(fileUrl: string): string {
  const marker = "/upload/";
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) {
    return fileUrl;
  }
  let path = fileUrl.slice(idx + marker.length);
  path = path.replace(/^v\d+\//, "");
  path = path.replace(/\.[^/.]+$/, "");
  return path;
}

const deleteAsset = async (fileUrl: string) => {
  const publicId = publicIdFromUrl(fileUrl);
  await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: "raw",
  });
};

const getSignedCloudinaryDownloadUrl = async (
  publicId: string,
): Promise<string | null> => {
  if (!environment.CLOUDINARY_API_KEY || !environment.CLOUDINARY_API_SECRET) {
    return null;
  }

  const url: unknown = cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    sign_url: true,
    secure: true,
  });

  return typeof url === "string" && url.length > 0 ? url : null;
};

export {
  upload,
  cloudinary,
  deleteAsset,
  saveUpload,
  getSignedCloudinaryDownloadUrl,
};
