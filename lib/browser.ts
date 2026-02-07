
import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * Interface for browser launch options
 */
interface BrowserOptions {
  headless?: boolean;
  args?: string[];
}

/**
 * Standardized browser manager for X automation
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Launches a new browser instance
   */
  async launch(options: BrowserOptions = {}) {
    if (this.browser) {
      console.log('Browser already running');
      return;
    }

    const defaultArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1280,720'
    ];

    this.browser = await puppeteer.launch({
      headless: options.headless ?? false, // Default to visible for debugging
      args: [...defaultArgs, ...(options.args || [])],
      defaultViewport: { width: 1280, height: 720 }
    });

    const pages = await this.browser.pages();
    this.page = pages[0];
    
    // Set user agent to avoid detection (basic)
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Browser launched successfully');
  }

  /**
   * Navigates to a URL
   */
  async navigate(url: string) {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  /**
   * Closes the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Returns the current page instance
   */
  getPage(): Page | null {
    return this.page;
  }
}
