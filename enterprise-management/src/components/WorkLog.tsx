"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Task, Person } from "./DashboardClient";

interface Props {
  tasks: Task[];
  people: Person[];
  onCommitSaved: () => void;
}

export default function WorkLog({ tasks, people, onCommitSaved }: Props) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualMinutes, setManualMinutes] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [completionPercent, setCompletionPercent] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // New task form
  const [ntAssignee, setNtAssignee] = useState("");
  const [ntRow, setNtRow] = useState("CURRENT");
  const [ntDueDate, setNtDueDate] = useState("");
  const [ntCompletion, setNtCompletion] = useState("0");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTimer = useCallback(() => {
    setTimerRunning((prev) => !prev);
  }, []);

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function getMinutes(): number {
    if (manualMinutes) return parseInt(manualMinutes) || 0;
    return Math.max(1, Math.round(elapsedSeconds / 60));
  }

  function selectTask(taskId: string) {
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setCompletionPercent(String(task.completionPercent));
    }
    setDropdownOpen(false);
    setSearch("");
  }

  function openCreateModal() {
    setNewTaskName(search);
    setNtAssignee(people[0]?.id || "");
    setNtRow("CURRENT");
    setNtDueDate("");
    setNtCompletion("0");
    setShowCreateModal(true);
    setDropdownOpen(false);
  }

  async function createNewTask() {
    if (!newTaskName.trim() || !ntAssignee) return;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskName.trim(),
        assigneePersonId: ntAssignee,
        rowStatus: ntRow,
        dueDate: ntDueDate || null,
        completionPercent: parseInt(ntCompletion) || 0,
      }),
    });

    const task = await res.json();
    setShowCreateModal(false);
    setSelectedTaskId(task.id);
    setCompletionPercent(String(task.completionPercent));
    setSearch("");
    onCommitSaved();
  }

  async function handleSave() {
    const newErrors: Record<string, string> = {};

    if (timerRunning) newErrors.timer = "Stop the timer before saving";
    if (!selectedTaskId) newErrors.task = "Task required";
    if (!completionPercent && completionPercent !== "0") newErrors.completion = "Completion % required";
    if (!description.trim()) newErrors.description = "Description required";
    const mins = getMinutes();
    if (mins <= 0 && !manualMinutes && elapsedSeconds === 0) newErrors.time = "Time required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    await fetch("/api/commits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: selectedTaskId,
        description: description.trim(),
        timeSpentMinutes: getMinutes(),
        completionPercentAfter: parseInt(completionPercent) || 0,
      }),
    });

    // Reset form
    setDescription("");
    setManualMinutes("");
    setElapsedSeconds(0);
    setTimerRunning(false);
    setSelectedTaskId("");
    setCompletionPercent("");
    setSaving(false);
    onCommitSaved();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Work Log</h2>
      </div>
      <div className="p-5 space-y-4">
        {/* Timer + Time input */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTimer}
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors text-white border border-transparent hover:opacity-90"
            style={{ backgroundColor: timerRunning ? "#FE5A4A" : "#87CCCE" }}
          >
            {timerRunning ? "Stop" : "Start"}
          </button>
          {(timerRunning || elapsedSeconds > 0) && (
            <span className="text-sm font-mono text-gray-600">{formatTime(elapsedSeconds)}</span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="number"
              min="0"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              placeholder="min"
              className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-400">min override</span>
          </div>
        </div>
        {errors.timer && <p className="text-xs text-red-500">{errors.timer}</p>}
        {errors.time && <p className="text-xs text-red-500">{errors.time}</p>}

        {/* Task selector */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-medium text-gray-500 mb-1">Task</label>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`w-full text-left px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              errors.task ? "border-red-300" : "border-gray-200"
            }`}
          >
            {selectedTask ? (
              <span className="text-gray-900">{selectedTask.title}</span>
            ) : (
              <span className="text-gray-400">Select a task...</span>
            )}
          </button>
          {errors.task && <p className="text-xs text-red-500 mt-0.5">{errors.task}</p>}

          {dropdownOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>
              <div>
                {filteredTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => selectTask(task.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-gray-700">{task.title}</span>
                    <span className="text-xs text-gray-400">{task.assignee?.name}</span>
                  </button>
                ))}
                {search && !filteredTasks.some((t) => t.title.toLowerCase() === search.toLowerCase()) && (
                  <button
                    onClick={openCreateModal}
                    className="w-full text-left px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 font-medium"
                  >
                    + Create &quot;{search}&quot;...
                  </button>
                )}
                {!search && (
                  <button
                    onClick={() => { setSearch(""); openCreateModal(); }}
                    className="w-full text-left px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 font-medium"
                  >
                    + Create new task...
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Completion % */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Completion %</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={completionPercent}
              onChange={(e) => setCompletionPercent(e.target.value)}
              className={`w-20 px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors.completion ? "border-red-300" : "border-gray-200"
              }`}
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
          {errors.completion && <p className="text-xs text-red-500 mt-0.5">{errors.completion}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none ${
              errors.description ? "border-red-300" : "border-gray-200"
            }`}
            placeholder="What did you work on?"
          />
          {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description}</p>}
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Assignee *</label>
              <select
                value={ntAssignee}
                onChange={(e) => setNtAssignee(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Row</label>
                <select
                  value={ntRow}
                  onChange={(e) => setNtRow(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="CURRENT">Current</option>
                  <option value="NEXT_SPRINT">Next Sprint</option>
                  <option value="BACKLOG">Backlog</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Completion %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={ntCompletion}
                  onChange={(e) => setNtCompletion(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={ntDueDate}
                onChange={(e) => setNtDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={createNewTask}
                disabled={!newTaskName.trim() || !ntAssignee}
                className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
