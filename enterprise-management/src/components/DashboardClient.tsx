"use client";

import { useState, useEffect, useCallback } from "react";
import FocusItems from "./FocusItems";
import WorkLog from "./WorkLog";
import TaskManager from "./TaskManager";

export interface Person {
  id: string;
  name: string;
  orderIndex: number;
  _count?: { tasks: number };
}

export interface Commit {
  id: string;
  taskId: string;
  timestamp: string;
  description: string;
  timeSpentMinutes: number;
  completionPercentAfter: number;
}

export interface Task {
  id: string;
  title: string;
  assigneePersonId: string;
  rowStatus: "CURRENT" | "NEXT_SPRINT" | "BACKLOG";
  completionPercent: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: Person;
  commits: Commit[];
}

export default function DashboardClient() {
  const [people, setPeople] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [pRes, tRes] = await Promise.all([
      fetch("/api/people"),
      fetch("/api/tasks"),
    ]);
    const [pData, tData] = await Promise.all([pRes.json(), tRes.json()]);
    setPeople(pData);
    setTasks(tData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-100 rounded-lg" />
          <div className="h-96 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FocusItems />
        <WorkLog tasks={tasks} people={people} onCommitSaved={fetchData} />
      </div>
      <TaskManager tasks={tasks} people={people} onDataChange={fetchData} />
    </div>
  );
}
