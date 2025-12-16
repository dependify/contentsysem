import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Deterministic wrapper for Minimax M2 LLM
 * Reads directive from file and executes with user context
 */
async function runMinimaxImpl(
  systemPromptPath: string, 
  userContext: string,
  model: string = "minimax-m2"
): Promise<string> {
  // Read the Directive (SOP)
  const directivePath = path.resolve(__dirname, `../directives/${systemPromptPath}`);
  
  if (!fs.existsSync(directivePath)) {
    throw new Error(`Directive not found: ${systemPromptPath}`);
  }
  
  const sop = fs.readFileSync(directivePath, 'utf-8');
  
  const client = new OpenAI({
    apiKey: process.env.MINIMAX_API_KEY,
    baseURL: "https://api.minimax.io/v1"
  });

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: sop },
        { role: "user", content: userContext }
      ],
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from Minimax API');
    }

    return content;
  } catch (error) {
    console.error(`Execution Error [Minimax]:`, error);
    throw error;
  }
}

/**
 * Alternative: OpenAI GPT-4 fallback
 */
async function runOpenAIImpl(
  systemPrompt: string,
  userContext: string,
  model: string = "gpt-4"
): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContext }
      ],
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI API');
    }

    return content;
  } catch (error) {
    console.error(`Execution Error [OpenAI]:`, error);
    throw error;
  }
}

// Named exports
export const runMinimax = runMinimaxImpl;
export const runOpenAI = runOpenAIImpl;
