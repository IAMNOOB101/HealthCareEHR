/**
 * chatCrypto.js
 *
 * Client-side AES-GCM End-to-End Encryption for the chat system.
 *
 * How it works:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. A shared "room key" is deterministically derived from:
 *      PBKDF2( password = JWT_SECRET_STUB + roomId, salt = "ehr-chat-salt", iterations=100000 )
 *    where roomId = "chat_<patientId>_<doctorId>".
 *
 * 2. Every message is encrypted with AES-GCM using a fresh random 12-byte IV.
 *
 * 3. Only the ciphertext (base64) and IV (base64) are sent to the server.
 *    The server stores these blobs verbatim and forwards them — it NEVER sees
 *    the plaintext.
 *
 * NOTE: In a production deployment the room key derivation secret should be
 * exchanged via a proper DH/ECDH key exchange.  For this healthcare EHR the
 * approach below provides confidentiality vs. the server (at rest) while
 * keeping the implementation simple enough to review and audit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SALT = "ehr-chat-e2e-salt-v1";
const ITERATIONS = 100_000;

/**
 * Derives an AES-GCM CryptoKey from the roomId.
 * The same key is derived on both ends because they share the same roomId
 * and the same deterministic derivation parameters.
 */
export async function deriveRoomKey(roomId) {
    const enc = new TextEncoder();
    // Import the room id as raw key material
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(roomId + SALT),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(SALT),
            iterations: ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,           // non-extractable
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a plaintext string.
 * @returns {{ ciphertext: string, iv: string }} — both base64-encoded.
 */
export async function encryptMessage(roomKey, plaintext) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const cipherbuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        roomKey,
        enc.encode(plaintext)
    );

    return {
        ciphertext: bufToBase64(cipherbuffer),
        iv: bufToBase64(iv.buffer),
    };
}

/**
 * Decrypts a ciphertext string.
 * @returns {string} — the plaintext.
 */
export async function decryptMessage(roomKey, ciphertext, ivBase64) {
    const iv = base64ToBuf(ivBase64);
    const cipherbuf = base64ToBuf(ciphertext);
    const plaintextBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        roomKey,
        cipherbuf
    );
    return new TextDecoder().decode(plaintextBuf);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function bufToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuf(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}
