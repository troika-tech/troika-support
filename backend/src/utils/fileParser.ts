import path from 'path';
import pdfParse from 'pdf-parse';
import { extractRawText } from 'mammoth';

const TEXT_FILE_EXTENSIONS = ['.txt', '.pdf', '.docx'];

export type SupportedFileType = 'txt' | 'pdf' | 'docx';

interface ParsedFile {
  text: string;
  fileType: SupportedFileType;
}

export const isSupportedKnowledgeFile = (fileName: string): boolean => {
  const ext = path.extname(fileName).toLowerCase();
  return TEXT_FILE_EXTENSIONS.includes(ext);
};

export const extractTextFromFile = async (file: Express.Multer.File): Promise<ParsedFile> => {
  const extension = path.extname(file.originalname).toLowerCase();

  switch (extension) {
    case '.txt': {
      const text = file.buffer.toString('utf-8');
      return { text, fileType: 'txt' };
    }
    case '.pdf': {
      const result = await pdfParse(file.buffer);
      return { text: result.text, fileType: 'pdf' };
    }
    case '.docx': {
      const result = await extractRawText({ buffer: file.buffer });
      return { text: result.value, fileType: 'docx' };
    }
    default: {
      throw new Error('Unsupported file type');
    }
  }
};

