import { z } from "zod";

/** ≈ 330 KB JPEG as a data URL: photos are compressed on the phone before upload. */
export const MAX_PHOTO_CHARS = 450_000;

export const JpegDataUrl = z
  .string()
  .max(MAX_PHOTO_CHARS)
  .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/);

/** Short free-text notes typed by a manager or worker. */
export const Note = z.string().trim().max(500);
