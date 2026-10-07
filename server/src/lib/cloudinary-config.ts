const cloudinary = require("cloudinary").v2;
import { CloudinaryStorage } from "multer-storage-cloudinary";
import type { UploadApiOptions } from "cloudinary";
import multer from "multer";
import environment from "../config/env.js";

cloudinary.config({
  cloud_name: environment.CLOUDINARY_CLOUD_NAME,
  api_key: environment.CLOUDINARY_API_KEY,
  api_secret: environment.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (_req, _file): UploadApiOptions => ({
    folder: "my_app_uploads",
    resource_type: "auto",
    allowed_formats: ["pdf", "doc", "docx", "csv", "txt", "md", "json"],
    public_id: `file-${Date.now()}`,
  }),
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

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

export { upload, cloudinary, deleteAsset };
