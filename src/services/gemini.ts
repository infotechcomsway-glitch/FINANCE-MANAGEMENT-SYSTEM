import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getFinancialInsights(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return "Start adding transactions to get AI-powered financial insights!";
  }

  const summary = transactions.slice(-20).map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    date: t.date
  }));

  const prompt = `
    As a professional financial advisor, analyze these recent transactions and provide 3 concise, actionable insights or tips to improve financial health. 
    Format the response in Markdown.
    
    Transactions:
    ${JSON.stringify(summary, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI advisor. Please try again later.";
  }
}
