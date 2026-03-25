declare module "pdf-parse" {
  interface PDFData {
    text: string;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  interface PDFOptions {
    max?: number;
  }

  function pdfParse(
    data: Buffer | Uint8Array,
    options?: PDFOptions
  ): Promise<PDFData>;

  export = pdfParse;
}

