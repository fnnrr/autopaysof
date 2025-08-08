import { GoogleGenAI } from "@google/genai";
import { Employee } from '../types.ts';

export const generatePayslipSummary = async (
  employee: Employee, 
  netPay: number, 
  totalHours: number, 
  overtimeHours: number
): Promise<string> => {
  // IMPORTANT: API_KEY and the AI client are initialized here to prevent a runtime crash on load
  // if the environment variable is not set in the deployment environment.
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API features will be disabled.");
    return "Payslip summary generation is unavailable. API key is missing.";
  }
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `
    Generate a brief, professional, and encouraging summary for an employee's payslip.
    The tone should be positive and appreciative. If there is overtime, acknowledge the extra effort.
    Do not use markdown or special formatting. Output plain text only.

    Employee Details:
    - Name: ${employee.name}
    - Net Pay for the month: $${netPay.toFixed(2)}
    - Total hours worked this month: ${totalHours.toFixed(2)}
    - Overtime hours: ${overtimeHours.toFixed(2)}

    Example Output (with overtime):
    "Dear ${employee.name}, here is your payslip. Your hard work is evident from the ${totalHours.toFixed(2)} hours you've dedicated, including ${overtimeHours.toFixed(2)} hours of overtime. Your commitment is crucial to our success. Thank you!"

    Example Output (no overtime):
    "Dear ${employee.name}, thank you for your consistent hard work and dedication this month. Your efforts are a valuable contribution to our team's success. We appreciate you!"

    Generate a similar summary now.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.5,
          topP: 0.95,
          thinkingConfig: { thinkingBudget: 0 } 
        }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating payslip summary with Gemini:", error);
    return "Could not generate an AI summary for this payslip. Please refer to the detailed breakdown.";
  }
};