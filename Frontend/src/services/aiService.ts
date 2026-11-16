import { post } from './api';
import type { PhoneDTO } from '@/types/api';

export interface AiChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AiChatRequest {
  message: string;
  history?: AiChatMessage[];
  imageBase64?: string;
  imageMimeType?: string;
}

export interface AiChatResponse {
  reply: string;
  suggestedPhones: PhoneDTO[];
}

export const aiService = {
  sendMessage: async (
    message: string,
    history?: AiChatMessage[],
    imageBase64?: string,
    imageMimeType?: string
  ): Promise<AiChatResponse> => {
    return post<AiChatResponse>('/ai/chat', { message, history, imageBase64, imageMimeType });
  },
};
