import "dotenv/config";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
if (!CLOUDINARY_CLOUD_NAME) {
  throw new Error("CLOUDINARY_CLOUD_NAME is not set");
}

const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
if (!CLOUDINARY_API_KEY) {
  throw new Error("CLOUDINARY_API_KEY is not set");
}

const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
if (!CLOUDINARY_API_SECRET) {
  throw new Error("CLOUDINARY_API_SECRET is not set");
}

const environment = {
  PORT: process.env.PORT ?? "8080",
  DATABASE_URL,
  JWT_SECRET,
  SECURE: process.env.NODE_ENV === "production",
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN ?? "7") * 24 * 60 * 60,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

export default environment;
