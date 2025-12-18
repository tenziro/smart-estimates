// import { GoogleGenAI } from "@google/genai";
import { EstimateData } from "../types";

// Gemini API는 현재 사용하지 않으므로 주석 처리합니다.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateEstimateNotes = async (data: EstimateData): Promise<string> => {
  /* AI 기능 비활성화됨
  try {
    const itemSummary = data.items.map(i => `${i.name} (${i.quantity}개)`).join(", ");
    
    const prompt = `
      당신은 전문적인 비즈니스 매니저입니다. 아래 견적서 내용을 바탕으로 견적서 하단에 들어갈 정중하고 전문적인 '비고' 또는 '인사말'을 작성해주세요.
      
      고객명: ${data.clientInfo.name}
      품목: ${itemSummary}
      공급자: ${data.myInfo.name}
      
      요구사항:
      1. 한국어로 작성하세요.
      2. 거래에 감사하며, 문의사항이 있으면 언제든 연락달라는 내용을 포함하세요.
      3. 납기일이나 결제 조건에 대한 일반적인 문구를 포함하여 3-4문장으로 요약하세요.
      4. 결과물은 텍스트만 반환하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error generating notes:", error);
    return "견적에 문의사항이 있으시면 언제든지 연락 부탁드립니다. 감사합니다.";
  }
  */
  return "견적에 문의사항이 있으시면 언제든지 연락 부탁드립니다. 감사합니다.";
};

export const enhanceItemDescription = async (itemName: string): Promise<string> => {
  /* AI 기능 비활성화됨
  try {
     const prompt = `
      '${itemName}'에 대한 짧고 전문적인 제품/서비스 설명을 한 문장으로 작성해주세요. 견적서의 품목 설명란에 들어갈 내용입니다.
      한국어로 작성하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Error enhancing description:", error);
    return "";
  }
  */
  return "";
}