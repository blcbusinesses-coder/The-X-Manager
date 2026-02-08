"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Play, Repeat, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from 'next/link';
import TaskReplay from "../components/TaskReplay";

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tasks, setTasks] = useState<any[]>([]);
    const [newTaskPrompt, setNewTaskPrompt] = useState("");
    const [recurrence, setRecurrence] = useState("one-off"); // one-off, daily, weekly
    const [viewingTask, setViewingTask] = useState<any>(null);

    useEffect(() => {
        fetchTasks();
    }, [currentDate]);

    const fetchTasks = async () => {
        // Fetch tasks for the current month range (roughly)
        // For simplicity in MVP, just fetching all and filtering in JS or fetch by range if needed
        // Let's just fetch all mostly recent ones for now to populate the calendar
        const { data } = await supabase.from('tasks').select('*');
        if (data) setTasks(data);
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate))
    });

    const getTasksForDate = (date: Date) => {
        return tasks.filter(task => {
            // 1. Scheduled directly for this day
            if (task.schedule_time && isSameDay(new Date(task.schedule_time), date)) return true;
            // 2. Created on this day (history)
            if (isSameDay(new Date(task.created_at), date)) return true;
            // 3. TODO: Handle recurrence validation visually
            return false;
        });
    };

    const handleCreateTask = async () => {
        if (!newTaskPrompt) return;

        // Calculate schedule time based on selected date + current time (or default to 9am)
        const scheduleTime = new Date(selectedDate);
        scheduleTime.setHours(9, 0, 0, 0);
        // If selected date is today/future, use it. If past, maybe warn or just set it.

        const { data, error } = await supabase.from('tasks').insert({
            prompt: newTaskPrompt,
            schedule_time: scheduleTime.toISOString(),
            recurrence: recurrence === 'one-off' ? null : recurrence,
            status: 'pending',
            task_type: recurrence === 'one-off' ? 'scheduled' : 'recurring'
        }).select();

        if (!error) {
            alert("Task Scheduled!");
            setNewTaskPrompt("");
            fetchTasks();
        } else {
            alert("Error scheduling task: " + error.message);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Sidebar: Navigation & Day Details */}
            <div className="lg:col-span-1 border-r border-white/20 pr-8 flex flex-col gap-6">
                <div>
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-mono uppercase border-b border-white pb-2 mb-4">Calendar</h1>
                    <div className="text-xl font-mono text-yellow-400 mb-1">
                        {format(selectedDate, 'EEEE')}
                    </div>
                    <div className="text-4xl font-mono font-bold">
                        {format(selectedDate, 'MMM d, yyyy')}
                    </div>
                </div>

                {/* Selected Day Tasks */}
                <div className="flex-1 overflow-y-auto">
                    <h3 className="font-mono text-sm text-gray-500 mb-2 uppercase">Tasks for this day</h3>
                    <div className="space-y-2">
                        {getTasksForDate(selectedDate).length === 0 && (
                            <div className="text-gray-600 text-sm italic">No tasks scheduled or recorded.</div>
                        )}
                        {getTasksForDate(selectedDate).map(task => (
                            <div key={task.id} className="border border-white/20 p-3 hover:bg-white/5 transition cursor-pointer" onClick={() => setViewingTask(task)}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold px-1 ${task.status === 'completed' ? 'bg-green-900 text-green-300' :
                                            task.status === 'failed' ? 'bg-red-900 text-red-300' :
                                                'bg-gray-800 text-gray-300'
                                        }`}>
                                        {task.status.toUpperCase()}
                                    </span>
                                    {task.recurrence && <Repeat size={14} className="text-blue-400" />}
                                </div>
                                <div className="text-sm line-clamp-2">{task.prompt}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Create Scheduled Task */}
                <div className="border-t border-white/20 pt-6">
                    <h3 className="font-mono text-sm text-gray-500 mb-2 uppercase">Schedule on this day</h3>
                    <textarea
                        className="w-full bg-black border border-white/50 p-2 text-sm mb-2 h-20 focus:outline-none focus:border-white"
                        placeholder="What should the agent do?"
                        value={newTaskPrompt}
                        onChange={e => setNewTaskPrompt(e.target.value)}
                    />
                    <div className="flex gap-2 mb-2">
                        {['one-off', 'daily', 'weekly'].map(r => (
                            <button
                                key={r}
                                onClick={() => setRecurrence(r)}
                                className={`text-xs px-2 py-1 uppercase border ${recurrence === r ? 'bg-white text-black border-white' : 'border-gray-600 text-gray-400 hover:border-white'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleCreateTask}
                        className="w-full bg-white text-black py-2 font-mono uppercase text-sm hover:bg-gray-200 transition"
                    >
                        Schedule Task
                    </button>
                </div>
            </div>

            {/* Main Content: Calendar Grid & Replay */}
            <div className="lg:col-span-2 flex flex-col gap-8">

                {viewingTask ? (
                    <div className="border border-white p-4 relative bg-gray-900/50">
                        <button
                            onClick={() => setViewingTask(null)}
                            className="absolute top-2 right-2 text-xs border border-white/50 px-2 py-1 hover:bg-white hover:text-black"
                        >
                            CLOSE REPLAY
                        </button>
                        <div className="mb-4">
                            <h2 className="text-xl font-mono mb-1">{viewingTask.prompt}</h2>
                            <div className="text-xs text-gray-400 font-mono">
                                STATUS: {viewingTask.status} | ID: {viewingTask.id}
                            </div>
                        </div>
                        {viewingTask.status === 'completed' || viewingTask.status === 'failed' ? (
                            <TaskReplay taskId={viewingTask.id} />
                        ) : (
                            <div className="h-64 flex items-center justify-center border border-white/10 text-gray-500 font-mono">
                                Task not yet executed. No replay available.
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-mono uppercase">{format(currentDate, 'MMMM yyyy')}</h2>
                            <div className="flex gap-2">
                                <button onClick={prevMonth} className="p-2 border border-white/50 hover:bg-white hover:text-black"><ChevronLeft size={20} /></button>
                                <button onClick={nextMonth} className="p-2 border border-white/50 hover:bg-white hover:text-black"><ChevronRight size={20} /></button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 border-l border-t border-white/20">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="p-2 border-r border-b border-white/20 font-mono text-center text-sm text-gray-500 uppercase">
                                    {day}
                                </div>
                            ))}
                            {daysInMonth.map((day, idx) => {
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const dayTasks = getTasksForDate(day);
                                const hasCompleted = dayTasks.some(t => t.status === 'completed');
                                const hasPending = dayTasks.some(t => t.status === 'pending' || t.status === 'processing');

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={`min-h-[100px] border-r border-b border-white/20 p-2 cursor-pointer transition relative
                                    ${!isCurrentMonth ? 'opacity-30 bg-gray-900/50' : ''}
                                    ${isSelected ? 'bg-white/10 ring-1 ring-white inset-0' : 'hover:bg-white/5'}
                                `}
                                    >
                                        <div className={`text-right font-mono text-sm mb-2 ${isSameDay(day, new Date()) ? 'text-yellow-400 font-bold' : ''}`}>
                                            {format(day, 'd')}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {dayTasks.map(t => (
                                                <div key={t.id} className={`h-1.5 w-full rounded-full ${t.status === 'completed' ? 'bg-green-500' :
                                                        t.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                                                    }`} title={t.prompt} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
