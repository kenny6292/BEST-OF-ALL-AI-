declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
  }

  const pdfParse: (buffer: Buffer) => Promise<PDFData>;
  export default pdfParse;
}
