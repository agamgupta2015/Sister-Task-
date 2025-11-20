import { GoogleGenAI, Type } from "@google/genai";
import { SmartTaskResponse, Priority, SISTERS } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseSmartInput = async (input: string): Promise<SmartTaskResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Parse the following request into a list of tasks for our todo app. 
      The available users are: ${SISTERS.join(', ')}. 
      If no user is specified, assign to "Anna" by default.
      Infer priority based on urgency words (ASAP -> High, eventual -> Low).
      
      Input: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  assignee: { type: Type.STRING, enum: [...SISTERS] },
                  priority: { type: Type.STRING, enum: [Priority.LOW, Priority.MEDIUM, Priority.HIGH] }
                },
                required: ["title", "assignee", "priority"]
              }
            }
          }
        }
      }
    });

    let text = response.text;
    if (!text) return null;
    
    // Clean potential markdown code blocks which are common in AI responses even with MIME type set
    text = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    return JSON.parse(text) as SmartTaskResponse;
  } catch (error) {
    console.error("Error parsing smart input:", error);
    return null;
  }
};

export const getMotivationalMessage = async (pendingCount: number, completedCount: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give a short, punchy, 1-sentence motivational quote for 3 sisters working together. 
      They have completed ${completedCount} tasks and have ${pendingCount} left. 
      Be fun and encouraging.`,
    });
    return response.text || "Keep up the great work, sisters!";
  } catch (error) {
    return "You're doing great together!";
  }
};