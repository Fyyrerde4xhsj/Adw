import { GoogleGenAI } from "@google/genai";
import { PROVIDED_API_KEY } from "../constants";
import { rtdb } from "../firebaseConfig";
import { ref, get } from "firebase/database";

// Cache the key in memory to avoid hitting DB on every request if it hasn't changed
let cachedApiKey: string | null = null;

const getApiKey = async (): Promise<string> => {
  // 1. Check if we have a cached custom key
  if (cachedApiKey) return cachedApiKey;

  // 2. Try to fetch from Firebase settings
  try {
    const snapshot = await get(ref(rtdb, 'settings/apiKey'));
    if (snapshot.exists()) {
      cachedApiKey = snapshot.val();
      return cachedApiKey as string;
    }
  } catch (error) {
    console.warn("Could not fetch custom API key from DB, falling back to default.", error);
  }

  // 3. Fallback to env or provided constant
  return process.env.API_KEY || PROVIDED_API_KEY;
};

// Helper to get an authenticated AI instance
const getAIClient = async () => {
  const key = await getApiKey();
  return new GoogleGenAI({ apiKey: key });
};

export const generateText = async (prompt: string, modelType: 'basic' | 'creative' = 'basic'): Promise<string> => {
  try {
    const ai = await getAIClient();
    const modelName = modelType === 'creative' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service. Please check your connection or API Key.";
  }
};

export const generateJSON = async <T>(prompt: string, schema?: any): Promise<T | null> => {
    try {
        const ai = await getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });
        
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text) as T;
    } catch (e) {
        console.error("JSON Generation Error", e);
        return null;
    }
}

export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const ai = await getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType, 
              data: base64Image
            }
          },
          { text: prompt }
        ]
      }
    });
    return response.text || "Could not analyze image.";
  } catch (error) {
    console.error("Vision API Error:", error);
    return "Error processing image.";
  }
};

export interface EnhancedPhotoResult {
  image?: string; // base64
  text?: string;
}

export const enhancePhoto = async (base64Image: string, mimeType: string, instructions: string): Promise<EnhancedPhotoResult> => {
  try {
    const ai = await getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType, 
              data: base64Image
            }
          },
          { text: `Enhance this image. Make it high quality, clear, and professional. ${instructions}` }
        ]
      }
    });

    let result: EnhancedPhotoResult = {};
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          result.image = part.inlineData.data;
        } else if (part.text) {
          result.text = part.text;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error("Image Enhancement Error:", error);
    return { text: "Failed to generate image. Please check API quota or image format." };
  }
};

export const transformPerson = async (
  base64Source: string, 
  mimeTypeSource: string, 
  base64Target: string, 
  mimeTypeTarget: string
): Promise<EnhancedPhotoResult> => {
  try {
    const ai = await getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: "Here is Person 1:" },
          {
            inlineData: {
              mimeType: mimeTypeSource, 
              data: base64Source
            }
          },
          { text: "\nHere is Person 2:" },
          {
            inlineData: {
              mimeType: mimeTypeTarget, 
              data: base64Target
            }
          },
          { text: "\nGenerate a photorealistic, heartwarming image of Person 1 and Person 2 hugging each other warmly. Ensure the facial features and likeness of both individuals are preserved." }
        ]
      }
    });

    let result: EnhancedPhotoResult = {};
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          result.image = part.inlineData.data;
        } else if (part.text) {
          result.text = part.text;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error("Person Transformation Error:", error);
    return { text: "Failed to generate image. Safety policies or API limit reached." };
  }
};

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const ai = await getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType, 
              data: base64Video
            }
          },
          { text: prompt }
        ]
      }
    });
    return response.text || "Could not analyze video.";
  } catch (error) {
    console.error("Video API Error:", error);
    return "Error processing video. The file might be too large.";
  }
};