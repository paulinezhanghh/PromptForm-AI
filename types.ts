export type QuestionType = 'FreeText' | 'MultipleChoice' | 'SingleChoice' | 'LikertScale';

export interface ProductImage {
  data: string; // Base64 encoded string
  mimeType: string;
  name: string; // Unique identifier (e.g., filename + timestamp)
}

export interface FormData {
  researchType: string;
  targetAudience: string;
  goalFocus: string;
  productStage: string;
  tone: string;
  productInfo: string;
  productImages: ProductImage[];
}

export interface Question {
  id: string;
  text: string;
  type?: QuestionType;
  options?: string[];
}

export interface CoreQuestionSection {
  topic: string;
  questions: Question[];
}

// Fix: Add ChatMessage type for the chatbot component
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeneratedContent {
  opening: Question[];
  core: CoreQuestionSection[];
  followUps: Question[];
  closing: Question[];
  // Metadata to track if the generated content is a questionnaire
  isQuestionnaire?: boolean;
}