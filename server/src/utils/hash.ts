import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import setupWasm from "argon2id/lib/setup.js";

const require = createRequire(import.meta.url);
const simdPath = require.resolve("argon2id/dist/simd.wasm");
const nonSimdPath = require.resolve("argon2id/dist/no-simd.wasm");

const argon2id = await setupWasm(
  (importObject) =>
    WebAssembly.instantiate(readFileSync(simdPath), importObject),
  (importObject) =>
    WebAssembly.instantiate(readFileSync(nonSimdPath), importObject),
);

const PARALLELISM = 4;
const PASSES = 3;
const MEMORY_SIZE = 2 ** 16;
const TAG_LENGTH = 32;
const SALT_LENGTH = 32;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function computeHash(password: string, salt: Uint8Array): Uint8Array {
  return argon2id({
    password: encoder.encode(password),
    salt,
    parallelism: PARALLELISM,
    passes: PASSES,
    memorySize: MEMORY_SIZE,
    tagLength: TAG_LENGTH,
  });
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = computeHash(password, salt);

  return [
    "argon2id",
    `m=${MEMORY_SIZE},t=${PASSES},p=${PARALLELISM}`,
    toBase64(salt),
    toBase64(hash),
  ].join("$");
};

export const verifyPassword = async (
  password: string,
  encodedHash: string,
): Promise<boolean> => {
  const parts = encodedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "argon2id") {
    return false;
  }

  const [, , saltB64, hashB64] = parts;
  if (!saltB64 || !hashB64) {
    return false;
  }

  const salt = fromBase64(saltB64);
  const expected = fromBase64(hashB64);
  const actual = computeHash(password, salt);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
};
