declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string;
  }

  function pdfParse(data: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<PDFParseResult>;

  export default pdfParse;
}

declare module 'mammoth' {
  interface ExtractRawTextResult {
    value: string;
  }

  interface ExtractRawTextOptions {
    buffer: Buffer;
  }

  export function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>;
}

