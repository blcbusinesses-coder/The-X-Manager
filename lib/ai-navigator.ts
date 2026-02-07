
import OpenAI from 'openai';
import { Page } from 'puppeteer';

// Initialize OpenAI client
// Note: In Next.js server context, we might need to ensure this is not called on client side or polyfilled.
// Since this is for the worker (Node.js), it is fine.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export type AIAction = {
    action: 'click' | 'type' | 'scroll_down' | 'wait' | 'done' | 'fail';
    reasoning: string;
    selector?: string; // CSS selector or text to match
    text?: string;     // Text to type
};

export class AINavigator {

    /**
     * Analyzes the current page state and decides the next action.
     */
    async decideNextAction(page: Page, goal: string, history: string[]): Promise<AIAction> {
        try {
            // 1. Capture Screenshot
            const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 50 });

            // 2. Construct Prompt
            const systemPrompt = `
You are an advanced autonomous agent navigating X.com (formerly Twitter) using a web browser.
Your goal is to complete the user's request efficiently.
You will receive the current screenshot of the browser page and a history of previous actions.

Return a JSON object with the next action to take.
The available actions are:
- "click": Click on an element. Provide a 'selector' field. 
    - PREFER using concise text content if the element is unique (e.g., "text=Log in", "text=Post").
    - primitives: "button[aria-label='Post']", "input[name='text']".
- "type": Type text into the *currently focused* element or a specific element.
    - If you need to click first, return "click".
    - If an input is likely focused (e.g. after clicking a text area), use "type" with 'text' field.
- "scroll_down": Scroll down the page to see more content.
- "wait": Wait for a few seconds (e.g., for loading).
- "done": The goal is successfully completed.
- "fail": The goal cannot be completed.

JSON Format:
{
  "reasoning": "Brief explanation of why this action is chosen.",
  "action": "click" | "type" | "scroll_down" | "wait" | "done" | "fail",
  "selector": "selector string (for click)",
  "text": "text content (for type)" 
}

Response MUST be valid JSON only. No markdown formatting.
`;

            const userMessage = `
User Goal: "${goal}"
Action History: ${history.join(' -> ')}
Current Page URL: ${page.url()}
`;

            // 3. Call OpenAI
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: userMessage },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${screenshot}` } }
                        ]
                    }
                ],
                max_tokens: 300,
                response_format: { type: "json_object" } // Force JSON
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error('No content from OpenAI');

            const decision = JSON.parse(content) as AIAction;
            return decision;

        } catch (error) {
            console.error('Error in AI decision:', error);
            return { action: 'fail', reasoning: `Error: ${error}` };
        }
    }
}
