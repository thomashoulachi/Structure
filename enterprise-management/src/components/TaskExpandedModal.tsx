"use client";

import { useState } from "react";
import type { Task, Person, Commit } from "./DashboardClient";

interface Props {
  task: Task;
  people: Person[];
  onClose: () => void;
  onDataChange: () => void;
}

export default function TaskExpandedModal({ task, people, onClose, onDataChange }: Props) {
  const [title, setTitle] = useState(task.title);
  const [completionPercent, setCompletionPercent] = useState(String(task.completionPercent));
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [editingCommit, setEditingCommit] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editMins, setEditMins] = useState("");
  const [editTimestamp, setEditTimestamp] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteCommit, setConfirmDeleteCommit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const commits = [...(task.commits || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const totalMinutes = commits.reduce((sum, c) => sum + c.timeSpentMinutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  const totalTimeStr = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  async function updateTask(field: string, value: string | number | null) {
    setSaving(true);
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, [field]: value }),
    });
    setSaving(false);
    onDataChange();
  }

  function handleTitleBlur() {
    if (title !== task.title) {
      updateTask("title", title);
    }
  }

  function handleCompletionBlur() {
    const val = parseInt(completionPercent) || 0;
    if (val !== task.completionPercent) {
      updateTask("completionPercent", Math.min(100, Math.max(0, val)));
    }
  }

  function handleDueDateChange(newDate: string) {
    setDueDate(newDate);
    updateTask("dueDate", newDate || null);
  }

  function startEditCommit(commit: Commit) {
    setEditingCommit(commit.id);
    setEditDesc(commit.description);
    setEditMins(String(commit.timeSpentMinutes));
    setEditTimestamp(new Date(commit.timestamp).toISOString().slice(0, 16));
  }

  async function saveCommitEdit() {
    if (!editingCommit) return;
    await fetch("/api/commits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingCommit,
        description: editDesc,
        timeSpentMinutes: parseInt(editMins) || 0,
        timestamp: editTimestamp ? new Date(editTimestamp).toISOString() : undefined,
      }),
    });
    setEditingCommit(null);
    onDataChange();
  }

  async function deleteCommit(commitId: string) {
    await fetch("/api/commits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commitId }),
    });
    setConfirmDeleteCommit(null);
    onDataChange();
  }

  async function deleteTask() {
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id }),
    });
    onClose();
    onDataChange();
  }

  function formatTimestamp(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-lg font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full py-0.5"
            />
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Completion:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={completionPercent}
                  onChange={(e) => setCompletionPercent(e.target.value)}
                  onBlur={handleCompletionBlur}
                  className="w-14 px-1.5 py-0.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Due:</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="px-1.5 py-0.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Total time:</span>
                <span className="text-sm font-medium text-gray-700">{totalTimeStr}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 shrink-0 mt-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body - Commits list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {saving && (
            <div className="text-xs text-blue-500 mb-2">Saving...</div>
          )}
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Commits ({commits.length})
          </h4>
          {commits.length === 0 ? (
            <p className="text-sm text-gray-400">No commits yet.</p>
          ) : (
            <div className="space-y-2">
              {commits.map((commit) => (
                <div key={commit.id} className="border border-gray-100 rounded-md p-3 group">
                  {editingCommit === commit.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editMins}
                          onChange={(e) => setEditMins(e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-gray-200 rounded"
                          placeholder="min"
                        />
                        <input
                          type="datetime-local"
                          value={editTimestamp}
                          onChange={(e) => setEditTimestamp(e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveCommitEdit}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCommit(null)}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{commit.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(commit.timestamp)}
                            </span>
                            <span className="text-xs text-gray-400">{commit.timeSpentMinutes}m</span>
                            <span className="text-xs text-gray-400">
                              {commit.completionPercentAfter}% after
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditCommit(commit)}
                            className="px-2 py-0.5 text-xs text-gray-400 hover:text-blue-600"
                          >
                            Edit
                          </button>
                          {confirmDeleteCommit === commit.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => deleteCommit(commit.id)}
                                className="px-2 py-0.5 text-xs text-red-600 font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteCommit(null)}
                                className="px-2 py-0.5 text-xs text-gray-400"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteCommit(commit.id)}
                              className="px-2 py-0.5 text-xs text-gray-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Delete this task and all commits?</span>
              <button
                onClick={deleteTask}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              Delete Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
