
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";

interface TaskReplayProps {
    taskId: string;
}

export default function TaskReplay({ taskId }: TaskReplayProps) {
    const [steps, setSteps] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSteps = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('task_steps')
                .select('*')
                .eq('task_id', taskId)
                .order('step_number', { ascending: true });

            if (data) setSteps(data);
            setLoading(false);
        };

        fetchSteps();

        // Subscription for live updates
        const channel = supabase
            .channel('task_steps_live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_steps', filter: `task_id=eq.${taskId}` }, (payload) => {
                setSteps(prev => [...prev, payload.new].sort((a, b) => a.step_number - b.step_number));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [taskId]);

    useEffect(() => {
        let interval: any;
        if (isPlaying && currentIndex < steps.length - 1) {
            interval = setInterval(() => {
                setCurrentIndex(prev => prev + 1);
            }, 1000); // 1 sec per step
        } else if (currentIndex >= steps.length - 1) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentIndex, steps.length]);

    if (loading && steps.length === 0) return <div className="text-white font-mono animate-pulse">Loading feed...</div>;
    if (steps.length === 0) return <div className="text-gray-500 font-mono">No recording available yet.</div>;

    const currentStep = steps[currentIndex];

    return (
        <div className="border border-white p-2 bg-black">
            {/* Screen Viewer */}
            <div className="relative aspect-video bg-gray-900 border border-gray-800 mb-2 overflow-hidden flex items-center justify-center">
                {currentStep?.screenshot ? (
                    <img src={currentStep.screenshot} alt={`Step ${currentStep.step_number}`} className="w-full h-full object-contain" />
                ) : (
                    <div className="text-xs text-gray-500">No Image</div>
                )}

                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 text-xs font-mono border border-white/20">
                    STEP {currentStep?.step_number} / {steps.length}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 text-xs font-mono border-t border-white/20">
                    <span className="text-green-400">ACTION:</span> {currentStep?.action_type} <br />
                    <span className="text-gray-400">{currentStep?.description}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-2">
                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="p-1 hover:bg-white hover:text-black transition">
                    <SkipBack size={16} />
                </button>

                <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 hover:bg-white hover:text-black transition flex-1 flex justify-center border border-white/20">
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <button onClick={() => setCurrentIndex(Math.min(steps.length - 1, currentIndex + 1))} className="p-1 hover:bg-white hover:text-black transition">
                    <SkipForward size={16} />
                </button>
            </div>

            {/* Scrubber */}
            <input
                type="range"
                min="0"
                max={steps.length - 1}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                className="w-full mt-2 accent-white bg-gray-800 h-1 appearance-none cursor-pointer"
            />
        </div>
    );
}
