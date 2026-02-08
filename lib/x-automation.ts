
import { BrowserManager } from './browser';
import { Page } from 'puppeteer';

export class XAutomation {
    private browserManager: BrowserManager;

    constructor() {
        this.browserManager = new BrowserManager();
    }

    async startBrowser(headless: boolean = false) {
        await this.browserManager.launch({ headless });
    }

    async closeBrowser() {
        await this.browserManager.close();
    }

    getPage() {
        return this.browserManager.getPage();
    }

    async login(username: string, password: string): Promise<boolean> {
        const page = this.browserManager.getPage();
        if (!page) throw new Error('Browser not started');

        try {
            console.log('Navigating to X login...');
            await page.goto('https://x.com/i/flow/login', { waitUntil: 'networkidle2' });

            // Wait for username input
            const usernameInputSelector = 'input[autocomplete="username"]';
            await page.waitForSelector(usernameInputSelector, { timeout: 10000 });
            await page.type(usernameInputSelector, username, { delay: 100 });

            // Click Next (Robust Strategy)
            const nextClicked = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('div[role="button"], span, button'));
                const nextBtn = els.find(el => el.textContent?.trim() === 'Next');
                if (nextBtn) { (nextBtn as HTMLElement).click(); return true; }
                return false;
            });
            if (!nextClicked) {
                console.log("Next button not found via text, pressing Enter...");
                await page.keyboard.press('Enter');
            }

            // Wait for password input
            const passwordInputSelector = 'input[name="password"]';
            await page.waitForSelector(passwordInputSelector, { timeout: 10000 });
            await page.type(passwordInputSelector, password, { delay: 100 });

            // Click Login (Robust Strategy)
            const loginClicked = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('div[role="button"], span, button'));
                const loginBtn = els.find(el => el.textContent?.trim() === 'Log in');
                if (loginBtn) { (loginBtn as HTMLElement).click(); return true; }
                return false;
            });
            if (!loginClicked) {
                console.log("Log in button not found via text, pressing Enter...");
                await page.keyboard.press('Enter');
            }


            // Wait for home timeline
            try {
                await page.waitForSelector('div[data-testid="primaryColumn"]', { timeout: 15000 });
            } catch (e) {
                console.log('Home timeline not detected immediately, but continuing...');
            }
            console.log('Login successful');
            return true;

        } catch (error) {
            console.error('Login failed:', error);
            // Capture screenshot for debugging
            if (page) await page.screenshot({ path: 'login-error.png' });
            return false;
        }
    }

    async navigateToHome() {
        const page = this.browserManager.getPage();
        if (!page) throw new Error('Browser not started');
        await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
    }

    /**
     * Executes a high-level goal using AI Vision
     */
    async executeTaskTarget(goal: string, taskId?: string, supabase?: any): Promise<boolean> {
        const page = this.browserManager.getPage();
        if (!page) throw new Error('Browser not started');

        // Lazy load the AI Navigator
        const { AINavigator } = await import('./ai-navigator');
        const ai = new AINavigator();

        let steps = 0;
        const maxSteps = 20;
        const history: string[] = [];

        console.log(`Starting execution for goal: "${goal}"`);

        while (steps < maxSteps) {
            console.log(`Step ${steps + 1}/${maxSteps}: Analyzing page...`);

            // 1. Decide next action & Capture Screenshot
            const screenshotBuffer = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 50 });
            const decision = await ai.decideNextAction(page, goal, history);

            console.log(`AI Decision:`, JSON.stringify(decision, null, 2));

            // 2. Save Step to DB if taskId and supabase provided
            if (taskId && supabase) {
                const screenshotString = `data:image/jpeg;base64,${screenshotBuffer}`;

                // Do not await this to keep speed up, catch errors
                supabase.from('task_steps').insert({
                    task_id: taskId,
                    step_number: steps + 1,
                    action_type: decision.action,
                    description: decision.reasoning,
                    screenshot: screenshotString
                }).then(({ error }: any) => {
                    if (error) console.error('Failed to save step:', error);
                });
            }

            history.push(decision.action);

            // 3. Handle terminal states
            if (decision.action === 'done') {
                console.log('Task completed successfully!');
                return true;
            }

            if (decision.action === 'fail') {
                console.warn('Task failed:', decision.reasoning);
                return false;
            }

            // 4. Perform action
            await this.performAction(page, decision);

            // 5. Wait for network idle or a bit of time for UI updates
            const waitTime = 2000 + Math.random() * 2000;
            await new Promise(r => setTimeout(r, waitTime));
            steps++;
        }

        console.warn('Max steps reached without completion.');
        return false;
    }

    private async performAction(page: Page, decision: any) {
        try {
            if (decision.action === 'click' && decision.selector) {
                if (decision.selector.startsWith('text=')) {
                    const text = decision.selector.split('text=')[1];
                    const elements = await page.$$('div, span, a, button, [role="button"]');
                    let found = false;
                    for (const el of elements) {
                        const content = await page.evaluate(node => node.textContent, el);
                        if (content && content.trim().includes(text)) {
                            try {
                                await el.click();
                                console.log(`Clicked element with text "${text}"`);
                                found = true;
                                break;
                            } catch (e) {
                                console.log(`Failed to click found element: ${e}`);
                            }
                        }
                    }
                    if (!found) {
                        console.warn(`Could not find element with text "${text}"`);
                    }
                } else {
                    await page.click(decision.selector).catch(e => console.warn(`Click failed on selector ${decision.selector}: ${e}`));
                }
            } else if (decision.action === 'type' && decision.text) {
                await page.keyboard.type(decision.text, { delay: 100 });
                await page.keyboard.press('Enter');
            } else if (decision.action === 'scroll_down') {
                await page.evaluate(() => window.scrollBy(0, 500));
            } else if (decision.action === 'wait') {
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            console.error('Error performing action:', e);
        }
    }
}
