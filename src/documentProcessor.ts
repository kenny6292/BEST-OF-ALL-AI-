import { createRequire } from "node:module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export type DocumentFormat = "pdf" | "docx" | "txt";
export interface ExtractedDocument { text: string; format: DocumentFormat; pages?: number; characters: number; words: number; }

const MAX_CHARS = 12_000_000, CHUNK_SIZE = 12_000, CHUNK_OVERLAP = 800;

export function detectFormat(filename: string, mimeType?: string): DocumentFormat {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (ext === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (ext === "txt" || mimeType?.startsWith("text/")) return "txt";
  throw new Error("Unsupported document type. Use PDF, DOCX, or TXT.");
}

export async function extractDocument(buffer: Buffer, filename: string, mimeType?: string): Promise<ExtractedDocument> {
  const format = detectFormat(filename, mimeType);
  let text = "";
  let pages: number | undefined;

  if (format === "pdf") {
    const r = await pdfParse(buffer);
    text = r.text;
    pages = r.numpages;
  } else if (format === "docx") {
    const r = await mammoth.extractRawText({ buffer });
    text = r.value;
  } else {
    text = buffer.toString("utf8");
  }

  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("No readable text was found in the document.");
  if (text.length > MAX_CHARS) throw new Error("Document is too large after extraction. Maximum extracted text is 12 million characters.");

  return { text, format, pages, characters: text.length, words: text.split(/\s+/).filter(Boolean).length };
}

export function chunkDocument(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (chunkSize <= overlap) throw new Error("chunkSize must be greater than overlap.");
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function chunkRecords(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): Array<{ index: number; content: string }> {
  return chunkDocument(text, chunkSize, overlap).map((content, index) => ({ index, content }));
}
