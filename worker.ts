
import { createClient } from '@supabase/supabase-js';
import { XAutomation } from './lib/x-automation';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key missing. Worker may fail to connect to DB.");
}

const supabase = createClient(supabaseUrl, supabaseKey || 'placeholder');

async function main() {
    console.log("Worker started. Polling for tasks...");

    if (!process.env.OPENAI_API_KEY) {
        console.error("CRITICAL: Missing OPENAI_API_KEY. AI Navigation will not work.");
    }

    const automation = new XAutomation();

    // Loop to poll for tasks
    while (true) {
        try {
            // 1. Fetch pending tasks from Supabase
            // We select the oldest pending task
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (error) {
                // Common if table doesn't exist yet
                // console.error('Error fetching tasks:', error.message);
            } else if (tasks && tasks.length > 0) {
                const task = tasks[0];
                console.log(`Processing task: ${task.id} - ${task.prompt}`);

                // Update status to processing
                await supabase.from('tasks').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', task.id);

                // Start Browser
                await automation.startBrowser(true); // Headless true for production

                // Login
                // Fetch credentials for this user? 
                // For simplified MVP, let's grab the first credential or one associated with the user_id if we have it
                const { data: creds } = await supabase.from('credentials').select('*').limit(1).single();

                if (creds) {
                    const loggedIn = await automation.login(creds.username, creds.password);
                    if (loggedIn) {
                        // Execute Task
                        const success = await automation.executeTaskTarget(task.prompt);

                        // Update status
                        await supabase.from('tasks').update({
                            status: success ? 'completed' : 'failed',
                            completed_at: new Date().toISOString(),
                            logs: success ? ['Task completed via AI'] : ['Task failed via AI']
                        }).eq('id', task.id);
                    } else {
                        console.error("Login failed for task", task.id);
                        await supabase.from('tasks').update({ status: 'failed', logs: ['Login failed'] }).eq('id', task.id);
                    }
                } else {
                    console.error("No credentials found in DB.");
                    // Fail the task so we don't loop forever
                    await supabase.from('tasks').update({ status: 'failed', logs: ['No credentials found'] }).eq('id', task.id);
                }

                await automation.closeBrowser();
            }

            // Sleep for 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (error) {
            console.error("Worker error:", error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

main();
