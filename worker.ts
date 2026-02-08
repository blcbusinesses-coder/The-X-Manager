
import { createClient } from '@supabase/supabase-js';
import { XAutomation } from './lib/x-automation';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Supabase
// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// USE SERVICE ROLE KEY FOR WORKER (Bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key missing. Worker may fail to connect to DB.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Worker started. Polling for tasks...");

    if (!process.env.OPENAI_API_KEY) {
        console.error("CRITICAL: Missing OPENAI_API_KEY. AI Navigation will not work.");
    }

    const automation = new XAutomation();

    // Loop to poll for tasks
    while (true) {
        try {
            // 1. Fetch pending tasks from Supabase that are ready to run
            // (schedule_time is null OR schedule_time <= now)
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'pending')
                .or(`schedule_time.is.null,schedule_time.lte.${new Date().toISOString()}`)
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
                        const success = await automation.executeTaskTarget(task.prompt, task.id, supabase);

                        // Update status
                        await supabase.from('tasks').update({
                            status: success ? 'completed' : 'failed',
                            completed_at: new Date().toISOString(),
                            logs: success ? ['Task completed via AI'] : ['Task failed via AI']
                        }).eq('id', task.id);

                        // Handle Recurrence
                        if (success && task.recurrence) {
                            let nextRun = new Date();
                            if (task.recurrence === 'daily') nextRun.setDate(nextRun.getDate() + 1);
                            if (task.recurrence === 'weekly') nextRun.setDate(nextRun.getDate() + 7);

                            // Keep next run time aligned with original schedule time if possible? 
                            // For simplicity, just add 24h from NOW. 
                            // Better: if schedule_time existed, add to THAT.
                            if (task.schedule_time) {
                                const originalTime = new Date(task.schedule_time);
                                if (task.recurrence === 'daily') originalTime.setDate(originalTime.getDate() + 1);
                                if (task.recurrence === 'weekly') originalTime.setDate(originalTime.getDate() + 7);
                                nextRun = originalTime;
                                // If nextRun is still in past (because we missed multiple), skip ahead? 
                                // MVP: just add 1 interval.
                            }

                            console.log(`Scheduling next run for ${task.recurrence} task: ${nextRun.toISOString()}`);

                            await supabase.from('tasks').insert({
                                prompt: task.prompt,
                                status: 'pending',
                                task_type: 'recurring',
                                recurrence: task.recurrence,
                                schedule_time: nextRun.toISOString(),
                                user_id: task.user_id
                            });
                        }

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
