import { GoogleGenAI, Type } from "@google/genai";
import type { FormData, GeneratedContent } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a placeholder. App may not function correctly.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const interviewQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique ID for the question." },
        text: { type: Type.STRING, description: "The question text." }
    },
    required: ['id', 'text']
};

const interviewResponseSchema = {
    type: Type.OBJECT,
    properties: {
        opening: { type: Type.ARRAY, items: interviewQuestionSchema },
        core: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    questions: { type: Type.ARRAY, items: interviewQuestionSchema }
                },
                required: ['topic', 'questions']
            }
        },
        followUps: { type: Type.ARRAY, items: interviewQuestionSchema },
        closing: { type: Type.ARRAY, items: interviewQuestionSchema }
    },
    required: ['opening', 'core', 'followUps', 'closing']
};


const questionnaireQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique ID for the question." },
        text: { type: Type.STRING, description: "The question text." },
        type: {
            type: Type.STRING,
            description: "The type of question.",
            enum: ['FreeText', 'MultipleChoice', 'SingleChoice', 'LikertScale']
        },
        options: {
            type: Type.ARRAY,
            description: "For choice-based questions ('MultipleChoice', 'SingleChoice', 'LikertScale'), provide an array of choices. Omit for 'FreeText'.",
            items: { type: Type.STRING }
        }
    },
    required: ['id', 'text', 'type']
};

const questionnaireResponseSchema = {
    type: Type.OBJECT,
    properties: {
        opening: { type: Type.ARRAY, description: "Array of opening/warm-up questions.", items: questionnaireQuestionSchema },
        core: {
            type: Type.ARRAY,
            description: "Array of core question sections.",
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    questions: { type: Type.ARRAY, items: questionnaireQuestionSchema }
                },
                required: ['topic', 'questions']
            }
        },
        followUps: { type: Type.ARRAY, description: "Array of follow-up questions.", items: questionnaireQuestionSchema },
        closing: { type: Type.ARRAY, description: "Array of closing questions.", items: questionnaireQuestionSchema }
    },
    required: ['opening', 'core', 'followUps', 'closing']
};


export async function generateQuestionnaire(formData: FormData): Promise<GeneratedContent> {
    const isQuestionnaire = formData.researchType.toLowerCase().includes('questionnaire');
    
    const imageInstruction = formData.productImages.length > 0 
        ? `A set of ${formData.productImages.length} product images has been provided. Use these images as a primary reference to understand the product's interface and features when generating questions.`
        : "";

    const interviewPrompt = `
        You are an expert user researcher. Your task is to generate a structured interview script based on the following parameters.
        Provide insightful and unbiased questions. Group core questions into logical topics.
        Tailor questions to the 'Product Details' provided.
        ${imageInstruction}
        Ensure every single question has a unique 'id' string field.

        Parameters:
        - Research Type: ${formData.researchType}
        - Target Audience: ${formData.targetAudience}
        - Primary Goal: ${formData.goalFocus}
        - Product Details: ${formData.productInfo || 'Not specified.'}
        - Product Stage: ${formData.productStage}
        - Desired Tone: ${formData.tone}

        Generate the output in the specified JSON format.
    `;

    const questionnairePrompt = `
        You are an expert survey designer. Your task is to generate a structured questionnaire based on the following parameters.
        Create a mix of question types: 'FreeText', 'SingleChoice', 'MultipleChoice', and 'LikertScale'.
        For 'SingleChoice', 'MultipleChoice', and 'LikertScale' questions, you MUST provide an 'options' array with the answer choices. For 'LikertScale', use a standard 5-point scale (e.g., 'Strongly Disagree' to 'Strongly Agree').
        For 'FreeText' questions, the 'options' array should be omitted.
        ${imageInstruction}
        Ensure every question has a unique 'id' and is tailored to the 'Product Details'.

        Parameters:
        - Research Type: ${formData.researchType}
        - Target Audience: ${formData.targetAudience}
        - Primary Goal: ${formData.goalFocus}
        - Product Details: ${formData.productInfo || 'Not specified.'}
        - Product Stage: ${formData.productStage}
        - Desired Tone: ${formData.tone}
        
        Generate the output in the specified JSON format.
    `;
    
    const promptText = isQuestionnaire ? questionnairePrompt : interviewPrompt;
    const schema = isQuestionnaire ? questionnaireResponseSchema : interviewResponseSchema;

    const parts: any[] = [{ text: promptText }];
    if (formData.productImages.length > 0) {
        formData.productImages.forEach(image => {
            parts.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data,
                },
            });
        });
    }

    const requestContents = parts.length > 1 ? { parts } : promptText;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: requestContents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.7,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedContent = JSON.parse(jsonText);

        if (!parsedContent.opening || !parsedContent.core || !parsedContent.followUps || !parsedContent.closing) {
             throw new Error("Received malformed content from AI. Missing required sections.");
        }
        
        // Add metadata to the content
        if (isQuestionnaire) {
            parsedContent.isQuestionnaire = true;
        }

        return parsedContent as GeneratedContent;

    } catch (error) {
        console.error("Error generating content:", error);
        if (error instanceof Error && error.message.includes('API_KEY')) {
             throw new Error("The API key is invalid or not configured correctly. Please check your environment variables.");
        }
        throw new Error("Failed to generate content. The AI model may be temporarily unavailable.");
    }
}

export async function refineQuestionnaire(
    formData: FormData, 
    currentContent: GeneratedContent, 
    refinementPrompt: string
): Promise<GeneratedContent> {
    const isQuestionnaire = currentContent.isQuestionnaire || formData.researchType.toLowerCase().includes('questionnaire');
    
    const imageInstruction = formData.productImages.length > 0 
        ? `A set of ${formData.productImages.length} product images was provided as a primary reference.`
        : "";

    const promptText = `
        You are an expert user researcher acting as a script editor. You have already generated a script for a user, and now they have a refinement request.
        Your task is to take the original parameters, the current script, and the user's new request, and generate a completely new, updated script in the specified JSON format. The new script should replace the old one entirely.

        ***

        ### Original Generation Parameters:
        - Research Type: ${formData.researchType}
        - Target Audience: ${formData.targetAudience}
        - Primary Goal: ${formData.goalFocus}
        - Product Details: ${formData.productInfo || 'Not specified.'}
        - Product Stage: ${formData.productStage}
        - Original Tone: ${formData.tone}
        ${imageInstruction}

        ***

        ### Current Script (JSON format):
        ${JSON.stringify(currentContent, null, 2)}

        ***

        ### User's Refinement Request:
        "${refinementPrompt}"

        ***

        Now, please provide the full, updated script in the exact same JSON structure as before, incorporating the user's request.
    `;
    
    const schema = isQuestionnaire ? questionnaireResponseSchema : interviewResponseSchema;

    const parts: any[] = [{ text: promptText }];
    if (formData.productImages.length > 0) {
        formData.productImages.forEach(image => {
            parts.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data,
                },
            });
        });
    }

    const requestContents = parts.length > 1 ? { parts } : promptText;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: requestContents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.5,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedContent = JSON.parse(jsonText);

        if (!parsedContent.opening || !parsedContent.core || !parsedContent.followUps || !parsedContent.closing) {
             throw new Error("Received malformed content from AI during refinement. Missing required sections.");
        }
        
        if (isQuestionnaire) {
            parsedContent.isQuestionnaire = true;
        }

        return parsedContent as GeneratedContent;

    } catch (error) {
        console.error("Error refining content:", error);
        if (error instanceof Error && error.message.includes('API_KEY')) {
             throw new Error("The API key is invalid or not configured correctly. Please check your environment variables.");
        }
        throw new Error("Failed to refine content. The AI model may be temporarily unavailable.");
    }
}
