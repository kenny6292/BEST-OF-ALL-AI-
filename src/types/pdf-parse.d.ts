declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
    [key: string]: unknown;
  }

  function pdfParse(buffer: Buffer): Promise<PDFData>;

  export default pdfParse;
}
