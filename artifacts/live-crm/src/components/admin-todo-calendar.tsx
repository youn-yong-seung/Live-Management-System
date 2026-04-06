import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ChevronLeft, ChevronRight, GripVertical,
  CheckCircle, Circle, Clock, SkipForward, Plus, Zap, Trash2,
} from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths, isToday,
} from "date-fns";
import { ko } from "date-fns/locale";

/* ── Types ──────────────────────────────────────────── */

interface Todo {
  id: number; projectId: number; projectTitle: string;
  title: string; status: string; scheduledDate: string | null;
  assigneeType: string | null; sortOrder: number;
}

/* ── Helpers ─────────────────────────────────────────── */

function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem("crm_admin_token");
  return fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Admin-Token": token || "", ...opts?.headers },
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "요청 실패");
    if (r.status === 204) return null as T;
    return r.json();
  });
}

const STATUS_ICON: Record<string, { icon: typeof Circle; color: string }> = {
  pending: { icon: Circle, color: "text-gray-400" },
  in_progress: { icon: Clock, color: "text-blue-400" },
  done: { icon: CheckCircle, color: "text-green-400" },
  skipped: { icon: SkipForward, color: "text-gray-300" },
};

/* ── Main Component ──────────────────────────────────── */

export function AdminTodoCalendar() {
  const { toast } = useToast();
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [unscheduled, setUnscheduled] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date());
  const [dragItem, setDragItem] = useState<Todo | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, unsched] = await Promise.all([
        apiFetch<Todo[]>("/todos/all"),
        apiFetch<Todo[]>("/todos/unscheduled"),
      ]);
      setAllTodos(all);
      setUnscheduled(unsched);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Calendar days
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Group todos by date
  const todosByDate = new Map<string, Todo[]>();
  allTodos.forEach((t) => {
    if (!t.scheduledDate) return;
    const key = format(new Date(t.scheduledDate), "yyyy-MM-dd");
    if (!todosByDate.has(key)) todosByDate.set(key, []);
    todosByDate.get(key)!.push(t);
  });

  // Drag handlers
  const handleDragStart = (todo: Todo) => {
    setDragItem(todo);
  };

  const handleDrop = async (date: Date) => {
    if (!dragItem) return;
    const dateStr = format(date, "yyyy-MM-dd'T'12:00:00");
    try {
      await apiFetch(`/todos/${dragItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ scheduledDate: dateStr }),
      });
      loadData();
      toast({ title: `"${dragItem.title}" → ${format(date, "M/d")}에 배정` });
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    }
    setDragItem(null);
  };

  const toggleStatus = async (todo: Todo) => {
    const next = todo.status === "done" ? "pending" : todo.status === "pending" ? "in_progress" : "done";
    await apiFetch(`/todos/${todo.id}`, { method: "PUT", body: JSON.stringify({ status: next }) });
    loadData();
  };

  const unschedule = async (todo: Todo) => {
    await apiFetch(`/todos/${todo.id}`, { method: "PUT", body: JSON.stringify({ scheduledDate: null }) });
    loadData();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: Unscheduled Todos ─────────── */}
        <div className="lg:w-[280px] flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            일정 미정 ({unscheduled.length})
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {unscheduled.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">모든 업무에 일정이 배정됨</p>
            ) : unscheduled.map((todo) => {
              const st = STATUS_ICON[todo.status] || STATUS_ICON.pending;
              const Icon = st.icon;
              return (
                <div
                  key={todo.id}
                  draggable
                  onDragStart={() => handleDragStart(todo)}
                  className="p-2.5 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <button onClick={() => toggleStatus(todo)} className="mt-0.5 flex-shrink-0">
                      <Icon className={`h-4 w-4 ${st.color}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-tight ${todo.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>{todo.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{todo.projectTitle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Calendar ─────────────────── */}
        <div className="flex-1">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <h3 className="text-base font-bold text-gray-800">
              {format(calMonth, "yyyy년 M월", { locale: ko })}
            </h3>
            <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 border-t border-l border-gray-200">
            {calDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTodos = todosByDate.get(key) || [];
              const inMonth = isSameMonth(day, calMonth);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  className={`min-h-[80px] border-r border-b border-gray-200 p-1 transition-colors ${
                    !inMonth ? "bg-gray-50/50" : dragItem ? "hover:bg-blue-50" : ""
                  } ${today ? "bg-blue-50/30" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-blue-100/50"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("bg-blue-100/50"); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("bg-blue-100/50"); handleDrop(day); }}
                >
                  <span className={`text-xs font-medium ${
                    today ? "bg-blue-500 text-white w-5 h-5 rounded-full inline-flex items-center justify-center" :
                    !inMonth ? "text-gray-300" : "text-gray-500"
                  }`}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayTodos.slice(0, 3).map((todo) => {
                      const st = STATUS_ICON[todo.status] || STATUS_ICON.pending;
                      return (
                        <div
                          key={todo.id}
                          draggable
                          onDragStart={() => handleDragStart(todo)}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] bg-white border border-gray-100 cursor-grab hover:border-blue-200 group"
                        >
                          <st.icon className={`h-2.5 w-2.5 flex-shrink-0 ${st.color}`} />
                          <span className={`truncate flex-1 ${todo.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>{todo.title}</span>
                          <button onClick={() => unschedule(todo)} className="opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <Trash2 className="h-2.5 w-2.5 text-gray-300 hover:text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                    {dayTodos.length > 3 && (
                      <span className="text-[9px] text-gray-400 pl-1">+{dayTodos.length - 3}개</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
