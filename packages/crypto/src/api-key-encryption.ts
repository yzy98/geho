import { base64url, CompactEncrypt, compactDecrypt } from "jose";

const KEY_ID = "v1";
const KEY_MANAGEMENT_ALGORITHM = "dir";
const CONTENT_ENCRYPTION_ALGORITHM = "A256GCM";
const ENCRYPTION_KEY_LENGTH = 32;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export class ApiKeyEncryptionError extends Error {
  override readonly name = "ApiKeyEncryptionError";
}

const assertValidEncryptionKey = (encryptionKey: Uint8Array): void => {
  if (encryptionKey.byteLength !== ENCRYPTION_KEY_LENGTH) {
    throw new ApiKeyEncryptionError(
      `Encryption key must be exactly ${ENCRYPTION_KEY_LENGTH} bytes`
    );
  }
};

export const decodeEncryptionKey = (encodedKey: string): Uint8Array => {
  if (!BASE64URL_PATTERN.test(encodedKey)) {
    throw new ApiKeyEncryptionError(
      "Encryption key must be valid unpadded base64url"
    );
  }

  let encryptionKey: Uint8Array;
  try {
    encryptionKey = base64url.decode(encodedKey);
  } catch (error) {
    throw new ApiKeyEncryptionError(
      "Encryption key must be valid unpadded base64url",
      { cause: error }
    );
  }

  assertValidEncryptionKey(encryptionKey);
  return encryptionKey;
};

export const encryptApiKey = async ({
  apiKey,
  encryptionKey,
}: {
  apiKey: string;
  encryptionKey: Uint8Array;
}): Promise<string> => {
  assertValidEncryptionKey(encryptionKey);

  if (apiKey.trim().length === 0) {
    throw new ApiKeyEncryptionError("API key must not be empty");
  }

  try {
    return await new CompactEncrypt(textEncoder.encode(apiKey))
      .setProtectedHeader({
        alg: KEY_MANAGEMENT_ALGORITHM,
        enc: CONTENT_ENCRYPTION_ALGORITHM,
        kid: KEY_ID,
      })
      .encrypt(encryptionKey);
  } catch (error) {
    if (error instanceof ApiKeyEncryptionError) {
      throw error;
    }

    throw new ApiKeyEncryptionError("Unable to encrypt API key", {
      cause: error,
    });
  }
};

export const decryptApiKey = async ({
  encryptedApiKey,
  encryptionKey,
}: {
  encryptedApiKey: string;
  encryptionKey: Uint8Array;
}): Promise<string> => {
  assertValidEncryptionKey(encryptionKey);

  try {
    const { plaintext, protectedHeader } = await compactDecrypt(
      encryptedApiKey,
      encryptionKey,
      {
        keyManagementAlgorithms: [KEY_MANAGEMENT_ALGORITHM],
        contentEncryptionAlgorithms: [CONTENT_ENCRYPTION_ALGORITHM],
      }
    );

    if (protectedHeader.kid !== KEY_ID) {
      throw new ApiKeyEncryptionError(
        `Unsupported encryption key ID: ${String(protectedHeader.kid)}`
      );
    }

    return textDecoder.decode(plaintext);
  } catch (error) {
    if (error instanceof ApiKeyEncryptionError) {
      throw error;
    }

    throw new ApiKeyEncryptionError("Unable to decrypt API key", {
      cause: error,
    });
  }
};
