
import { NextResponse } from 'next/server';
import { XAutomation } from '@/lib/x-automation';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, username, password, task } = body;

        console.log('Received action:', action);

        // In a real scenario with a separate worker, we would write to Supabase here.
        // For local testing/demo, we can try to run the automation directly if running in a capable environment.

        // Check if we are running in a serverless environment (like Vercel) where Puppeteer might fail
        // if (process.env.VERCEL) { ... }

        // For now, let's assume this runs locally or on a VPS where Puppeteer is installed.
        const x = new XAutomation();

        if (action === 'start_browser') {
            // This is a long running process, so we shouldn't await it fully in a serverless function response
            // But for local testing, we might want to see it work.

            // We'll start it and return immediately, or wait for login?
            // Let's wait for login to confirm credentials.
            await x.startBrowser(false); // Headless false for demo
            const success = await x.login(username, password);

            if (success) {
                return NextResponse.json({ success: true, message: 'Browser started and logged in' });
            } else {
                await x.closeBrowser();
                return NextResponse.json({ success: false, message: 'Login failed' }, { status: 401 });
            }
        }

        return NextResponse.json({ success: false, message: 'Unknown action' });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
