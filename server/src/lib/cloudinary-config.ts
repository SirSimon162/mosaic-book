const cloudinary = require("cloudinary").v2;
import multer from "multer";
import environment from "../config/env.js";
import AppError from "./http-error.js";
import { Status } from "./http-code.js";
import { allowedUploadExtensions } from "../modules/workspace/workspace.types.js";

cloudinary.config({
  cloud_name: environment.CLOUDINARY_CLOUD_NAME,
  api_key: environment.CLOUDINARY_API_KEY,
  api_secret: environment.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const extension = file.originalname.split(".").pop()?.toLowerCase();
    if (!extension || !allowedUploadExtensions.includes(extension)) {
      callback(new AppError("Unsupported file", Status.BAD_REQUEST));
      return;
    }
    callback(null, true);
  },
});

function saveUpload(file: Express.Multer.File): Promise<string> {
  if (!file.buffer) {
    return Promise.reject(new AppError("File is required", Status.BAD_REQUEST));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "my_app_uploads",
        resource_type: "auto",
        allowed_formats: [...allowedUploadExtensions],
        public_id: `file-${Date.now()}`,
      },
      (error: unknown, result: { secure_url?: string } | undefined) => {
        if (error || !result?.secure_url) {
          reject(error ?? new AppError("Upload failed", Status.INTERNAL_SERVER_ERROR));
          return;
        }
        resolve(result.secure_url);
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
  try {
    const publicId = publicIdFromUrl(fileUrl);
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: "raw",
    });
  } catch (e) {
    throw e
  }
};

export { upload, cloudinary, deleteAsset, saveUpload };
