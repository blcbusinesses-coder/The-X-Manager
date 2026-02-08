
"use client";

import { useState, useEffect } from "react";
import { Play, Calendar, Save, Terminal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import TaskReplay from "./components/TaskReplay";

export default function Home() {
  const [task, setTask] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [schedule, setSchedule] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  // New state for tasks and replay
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      // Load Credentials placeholder
      const { data: creds } = await supabase.from('credentials').select('*').limit(1).single();
      if (creds) {
        setUsername(creds.username);
        setPassword(creds.password); // In real app, don't show this
      }

      // Load Tasks
      const { data: recentTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(10);
      if (recentTasks) setTasks(recentTasks);
    };
    fetchData();

    // Subscribe to task updates
    const channel = supabase.channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, []);

  const executeTask = async () => {
    if (!task) return;
    setLogs((prev) => [...prev, `> Sending task: ${task}`]);

    const { error } = await supabase.from('tasks').insert({
      prompt: task,
      status: 'pending',
      task_type: 'one-off'
    });

    if (error) {
      setLogs((prev) => [...prev, `! Error: ${error.message}`]);
    } else {
      setLogs((prev) => [...prev, `> Task queued successfully.`]);
      setTask("");
    }
  };

  const saveCredentials = async () => {
    // Check if user exists first (since username is not unique in DB schema yet)
    const { data: existing } = await supabase.from('credentials').select('id').eq('username', username).limit(1).single();

    let result;
    if (existing) {
      // Update
      result = await supabase.from('credentials').update({
        password,
        status: 'active' // Changed from account_status to status
      }).eq('id', existing.id);
    } else {
      // Insert
      result = await supabase.from('credentials').insert({
        username,
        password,
        status: 'active'
      });
    }

    if (result.error) {
      console.error("Error saving:", result.error);
      alert('Error saving credentials: ' + result.error.message);
    } else {
      alert('Credentials saved!');
    }
  };

  const scheduleTask = async () => {
    // similar logic
    alert("Scheduling not fully wired yet.");
  }

  return (
    <main className="grid grid-cols-1 md:grid-cols-2 gap-8 h-screen p-8 bg-black text-white">
      {/* Left Column: Controls */}
      <div className="space-y-8 overflow-y-auto">

        {/* Credentials Section */}
        <section className="border border-white p-6 relative">
          <h2 className="absolute -top-3 left-4 bg-black px-2 font-mono text-sm">CREDENTIALS</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono mb-1 uppercase">X Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black border border-white p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-xs font-mono mb-1 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-white p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={saveCredentials}
              className="w-full border border-white py-2 hover:bg-white hover:text-black transition flex items-center justify-center gap-2 text-sm font-mono uppercase"
            >
              <Save size={16} /> Save Credentials
            </button>
          </div>
        </section>

        {/* Task Input Section */}
        <section className="border border-white p-6 relative">
          <h2 className="absolute -top-3 left-4 bg-black px-2 font-mono text-sm">COMMAND CENTER</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono mb-1 uppercase">One-off Task</label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="w-full bg-black border border-white p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-white h-24"
                placeholder="e.g. Go to search, find latest news on AI, like the top 3 posts..."
              />
            </div>
            <button
              onClick={executeTask}
              className="w-full border border-white py-2 hover:bg-white hover:text-black transition flex items-center justify-center gap-2 text-sm font-mono uppercase"
            >
              <Play size={16} /> Execute Now
            </button>
          </div>
        </section>

        {/* Task List / History */}
        <section className="border border-white p-6 relative">
          <h2 className="absolute -top-3 left-4 bg-black px-2 font-mono text-sm">TASK ACTIVITY</h2>
          <div className="absolute -top-3 right-4 bg-black px-2">
            <a href="/calendar" className="text-xs font-mono border border-white px-2 py-1 hover:bg-white hover:text-black transition">
              VIEW CALENDAR
            </a>
          </div>
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="border border-white/20 p-2 flex justify-between items-center text-xs font-mono">
                <div className="truncate max-w-[200px]">
                  <div className={
                    t.status === 'completed' ? 'text-green-400' :
                      t.status === 'failed' ? 'text-red-400' :
                        t.status === 'processing' ? 'text-yellow-400' : 'text-gray-400'
                  }>{t.status.toUpperCase()}</div>
                  <div className="opacity-70">{t.prompt}</div>
                </div>
                <button
                  onClick={() => setSelectedTaskId(selectedTaskId === t.id ? null : t.id)}
                  className="border border-white px-2 py-1 hover:bg-white hover:text-black transition uppercase ml-2"
                >
                  {selectedTaskId === t.id ? 'Close' : 'Watch'}
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Right Column: Replay & Logs */}
      <div className="border border-white p-6 relative h-full flex flex-col gap-4">
        <h2 className="absolute -top-3 left-4 bg-black px-2 font-mono text-sm">LIVE FEED & REPLAY</h2>

        {selectedTaskId ? (
          <div className="flex-1 flex flex-col">
            <div className="mb-2 font-mono text-sm text-yellow-500">Watching Task: {selectedTaskId}</div>
            {/* Replay Component */}
            <TaskReplay taskId={selectedTaskId} />

            <div className="mt-4 flex-1 overflow-y-auto border-t border-white/20 pt-2">
              <div className="font-mono text-xs text-gray-400">Task specific logs would go here...</div>
            </div>
          </div>
        ) : (
          <div className="font-mono text-xs space-y-1 h-full overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="break-words">{log}</div>
            ))}
            <div className="animate-pulse">_</div>
            <div className="mt-10 text-center text-gray-500">Select "Watch" on a task to view live execution.</div>
          </div>
        )}
      </div>

    </main>
  );
}


