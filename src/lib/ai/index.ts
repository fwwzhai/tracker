import "server-only";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { MEAL_SCHEMA, parseMeal, type MealResult } from "../meal";

// Strict split: Gemini only ever sees images, OpenAI does all text work.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";

const MEAL_PROMPT = `You estimate nutrition for meals eaten in Malaysia. Know Malaysian and Southeast Asian dishes well
(nasi lemak, roti canai, mee goreng, laksa, char kuey teow, nasi kandar, teh tarik, kuih, etc.) and typical
hawker portion sizes. Split the meal into items. For each give name, portion (short, e.g. "1 plate"), kcal,
protein, carbs, fat in grams, and confidence 0 to 1. total is the sum of items. If the input is not food,
return empty items and set error to a short reason; otherwise error is "". JSON only.`;

let gemini: GoogleGenAI | undefined;
let openai: OpenAI | undefined;

/** Temperature 0.2 where the model accepts it; GPT-5.0 family and o-series only take reasoning effort. */
function openaiTuning(model: string) {
  if (/^gpt-5(-|$)/.test(model)) return { reasoning: { effort: "minimal" as const } };
  if (/^gpt-5\.\d/.test(model)) return { reasoning: { effort: "none" as const }, temperature: 0.2 };
  if (/^o\d/.test(model)) return { reasoning: { effort: "low" as const } };
  return { temperature: 0.2 };
}

export async function analyzePhoto(base64: string, mimeType = "image/jpeg"): Promise<MealResult> {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: base64 } }, { text: "Analyse this meal." }] }],
    config: {
      systemInstruction: MEAL_PROMPT,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: MEAL_SCHEMA,
      maxOutputTokens: 800,
    },
  });
  return parseMeal(res.text ?? "");
}

export async function analyzeText(description: string): Promise<MealResult> {
  openai ??= new OpenAI();
  const res = await openai.responses.create({
    model: OPENAI_MODEL,
    instructions: MEAL_PROMPT,
    input: description.slice(0, 500),
    text: { format: { type: "json_schema", name: "meal", schema: MEAL_SCHEMA as unknown as Record<string, unknown>, strict: true } },
    max_output_tokens: 1500,
    ...openaiTuning(OPENAI_MODEL),
  });
  return parseMeal(res.output_text);
}

/** Short free text answer (coach nudge and chat). */
export async function writeText(instructions: string, input: string, maxTokens = 400): Promise<string> {
  openai ??= new OpenAI();
  const res = await openai.responses.create({
    model: OPENAI_MODEL,
    instructions,
    input,
    max_output_tokens: maxTokens,
    ...openaiTuning(OPENAI_MODEL),
  });
  return res.output_text.trim();
}
