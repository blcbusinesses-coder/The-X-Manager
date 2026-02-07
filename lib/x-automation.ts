
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

            // Click Next
            await page.keyboard.press('Enter');

            // Wait for password input
            const passwordInputSelector = 'input[name="password"]';
            await page.waitForSelector(passwordInputSelector, { timeout: 10000 });
            await page.type(passwordInputSelector, password, { delay: 100 });

            // Click Login
            await page.waitForSelector('div[data-testid="LoginForm_Login_Button"]', { timeout: 5000 }).then(res => res?.click()).catch(() => page.keyboard.press('Enter'));


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
    async executeTaskTarget(goal: string): Promise<boolean> {
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

            // 1. Decide next action
            const decision = await ai.decideNextAction(page, goal, history);
            console.log(`AI Decision:`, JSON.stringify(decision, null, 2));

            history.push(decision.action);

            // 2. Handle terminal states
            if (decision.action === 'done') {
                console.log('Task completed successfully!');
                return true;
            }

            if (decision.action === 'fail') {
                console.warn('Task failed:', decision.reasoning);
                return false;
            }

            // 3. Perform action
            await this.performAction(page, decision);

            // 4. Wait for network idle or a bit of time for UI updates
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
