import { environment } from "../config/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: environment.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
