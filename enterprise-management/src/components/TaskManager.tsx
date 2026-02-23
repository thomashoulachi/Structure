"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import type { Task, Person } from "./DashboardClient";
import TaskExpandedModal from "./TaskExpandedModal";

const ROW_LABELS: Record<string, string> = {
  CURRENT: "Current",
  NEXT_SPRINT: "Next Sprint",
  BACKLOG: "Backlog",
};

const ROWS = ["CURRENT", "NEXT_SPRINT", "BACKLOG"] as const;

interface Props {
  tasks: Task[];
  people: Person[];
  onDataChange: () => void;
}

function DroppableCell({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-2 space-y-2 transition-colors rounded ${
        isOver ? "bg-brand-50" : ""
      }`}
    >
      {children}
    </div>
  );
}

function TaskCard({
  task,
  onClick,
  isDragOverlay,
}: {
  task: Task;
  onClick?: () => void;
  isDragOverlay?: boolean;
}) {
  const totalMinutes = task.commits?.reduce((sum, c) => sum + c.timeSpentMinutes, 0) || 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-md p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all ${
        isDragOverlay ? "shadow-lg ring-2 ring-brand-200" : ""
      }`}
    >
      <div className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-gray-500">{task.completionPercent}%</span>
        {totalMinutes > 0 && <span className="text-xs text-gray-400">{timeStr}</span>}
      </div>
      {task.completionPercent > 0 && (
        <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1">
          <div
            className="h-1 rounded-full transition-all"
            style={{ backgroundColor: "#FE5A4A" }}
            style={{ width: `${Math.min(task.completionPercent, 100)}%` }}
          />
        </div>
      )}
      {task.dueDate && (
        <div className="mt-1 text-xs text-gray-400">Due: {task.dueDate}</div>
      )}
    </div>
  );
}

function DraggableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

export default function TaskManager({ tasks, people, onDataChange }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [expandedTask, setExpandedTask] = useState<Task | null>(null);
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [removingPerson, setRemovingPerson] = useState<Person | null>(null);
  const [replacementPersonId, setReplacementPersonId] = useState("");

  // Keep expanded task in sync with fresh data
  useEffect(() => {
    if (expandedTask) {
      const updated = tasks.find((t) => t.id === expandedTask.id);
      if (updated) {
        setExpandedTask(updated);
      } else {
        setExpandedTask(null);
      }
    }
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function getTasksForCell(row: string, personId: string) {
    return tasks.filter(
      (t) => t.rowStatus === row && t.assigneePersonId === personId
    );
  }

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskId = event.active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const cellId = over.id as string;
      const [row, personId] = cellId.split("::");

      if (!row || !personId) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      if (task.rowStatus === row && task.assigneePersonId === personId) return;

      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, rowStatus: row, assigneePersonId: personId }),
      });
      onDataChange();
    },
    [tasks, onDataChange]
  );

  async function addPerson() {
    if (!newPersonName.trim()) return;
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPersonName.trim() }),
    });
    setNewPersonName("");
    onDataChange();
  }

  async function removePerson() {
    if (!removingPerson) return;
    const taskCount = tasks.filter((t) => t.assigneePersonId === removingPerson.id).length;

    if (taskCount > 0 && !replacementPersonId) return;

    await fetch("/api/people", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: removingPerson.id,
        replacementId: replacementPersonId || undefined,
      }),
    });
    setRemovingPerson(null);
    setReplacementPersonId("");
    onDataChange();
  }

  function openTaskModal(task: Task) {
    setExpandedTask(task);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Task Manager</h2>
        <button
          onClick={() => setShowManagePeople(!showManagePeople)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          Manage People
        </button>
      </div>

      {showManagePeople && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="New person name"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              onKeyDown={(e) => e.key === "Enter" && addPerson()}
            />
            <button
              onClick={addPerson}
              className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-md hover:bg-brand-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-1 text-sm text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1">
                <span>{p.name}</span>
                <button
                  onClick={() => {
                    setRemovingPerson(p);
                    setReplacementPersonId("");
                  }}
                  className="text-gray-300 hover:text-red-500 ml-1"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remove person confirmation modal */}
      {removingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Remove {removingPerson.name}?</h3>
            {tasks.filter((t) => t.assigneePersonId === removingPerson.id).length > 0 ? (
              <>
                <p className="text-sm text-gray-600">
                  This person has {tasks.filter((t) => t.assigneePersonId === removingPerson.id).length} task(s).
                  Reassign them to:
                </p>
                <select
                  value={replacementPersonId}
                  onChange={(e) => setReplacementPersonId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
                >
                  <option value="">Select replacement...</option>
                  {people
                    .filter((p) => p.id !== removingPerson.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </>
            ) : (
              <p className="text-sm text-gray-600">This person has no tasks.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRemovingPerson(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={removePerson}
                disabled={
                  tasks.filter((t) => t.assigneePersonId === removingPerson.id).length > 0 &&
                  !replacementPersonId
                }
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full min-w-[800px] table-fixed">
            <colgroup>
              <col className="w-28" />
              {people.map((person) => (
                <col key={person.id} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                {people.map((person) => (
                  <th
                    key={person.id}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {person.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row} className="border-b border-gray-50 align-top">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-600">{ROW_LABELS[row]}</span>
                  </td>
                  {people.map((person) => {
                    const cellId = `${row}::${person.id}`;
                    const cellTasks = getTasksForCell(row, person.id);
                    return (
                      <td key={cellId} className="px-1 py-1">
                        <DroppableCell id={cellId}>
                          {cellTasks.map((task) => (
                            <DraggableTaskCard
                              key={task.id}
                              task={task}
                              onClick={() => openTaskModal(task)}
                            />
                          ))}
                        </DroppableCell>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Expanded Task Modal */}
      {expandedTask && (
        <TaskExpandedModal
          task={expandedTask}
          people={people}
          onClose={() => setExpandedTask(null)}
          onDataChange={onDataChange}
        />
      )}
    </div>
  );
}
