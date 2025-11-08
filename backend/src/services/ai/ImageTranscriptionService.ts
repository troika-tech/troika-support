import OpenAIService from './OpenAIService';
import logger from '../../utils/logger';

class ImageTranscriptionService {
  async transcribeImages(images: string[]): Promise<string[]> {
    const transcripts: string[] = [];

    for (let i = 0; i < images.length; i += 1) {
      const image = images[i];

      try {
        const transcript = await OpenAIService.transcribeImage(image);
        transcripts.push(transcript);
      } catch (error) {
        logger.error('Failed to transcribe image', {
          index: i,
          error,
        });

        transcripts.push('');
      }
    }

    return transcripts;
  }
}

export default new ImageTranscriptionService();

