
"use client";

import { useState } from "react";
import { Play, Calendar, Save, Terminal } from "lucide-react";

export default function Home() {
  const [task, setTask] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [schedule, setSchedule] = useState("");
  const [logs, setLogs] = useState<string[]>(["System initialized...", "Waiting for input..."]);

  // Placeholder for executing task
  const executeTask = async () => {
    setLogs((prev) => [...prev, `> Executing task: ${task}`]);
    // TODO: Call API to start browser
    try {
      // Mock API call
      // await fetch('/api/start-browser', { method: 'POST', body: JSON.stringify({ task, username, password }) });
      setLogs((prev) => [...prev, "> Browser launched in cloud...", "> Navigating to X.com...", "> Login successful..."]);
    } catch (error) {
      setLogs((prev) => [...prev, `! Error: ${error}`]);
    }
  };

  const saveCredentials = () => {
    // TODO: Save to Supabase
    setLogs((prev) => [...prev, "> Credentials saved securely."]);
  };

  const scheduleTask = () => {
    setLogs((prev) => [...prev, `> Task scheduled for: ${schedule}`]);
  }

  return (
    <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column: Controls */}
      <div className="space-y-8">

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

        {/* Schedule Section */}
        <section className="border border-white p-6 relative">
          <h2 className="absolute -top-3 left-4 bg-black px-2 font-mono text-sm">SCHEDULER</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono mb-1 uppercase">Date & Time</label>
              <input
                type="datetime-local"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full bg-black border border-white p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-white " // calendar-picker-indicator invert filter needed for white
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <button
              onClick={scheduleTask}
              className="w-full border border-white py-2 hover:bg-white hover:text-black transition flex items-center justify-center gap-2 text-sm font-mono uppercase"
            >
              <Calendar size={16} /> Schedule Task
            </button>
          </div>
        </section>

      </div>

      {/* Right Column: Logs/Terminal */}
      <div className="border border-white p-6 relative h-full min-h-[500px]">
        <h2 className="absolute -top-3 left-4 bg-black px-2 font-mono text-sm">LIVE FEED</h2>
        <div className="font-mono text-xs space-y-1 h-full overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="break-words">{log}</div>
          ))}
          <div className="animate-pulse">_</div>
        </div>
      </div>

    </main>
  );
}
