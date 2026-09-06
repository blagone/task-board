"use client";

import { type CSSProperties, type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Status = "backlog" | "progress" | "done";
type Priority = "low" | "medium" | "high";
type Theme = "light" | "dark";
type View = "tasks" | "calendar" | "analytics";

type Task = {
  id: string;
  title: string;
  project: string;
  due: string;
  status: Status;
  priority: Priority;
  progress: number;
  notes: string;
  tag?: string;
};

const initialTasks: Task[] = [
  { id: "1", title: "Подготовить структуру лендинга", project: "Ember & Bean", due: "Сегодня", status: "done", priority: "high", progress: 100, notes: "Собрать финальную структуру и проверить последовательность блоков.", tag: "Дизайн" },
  { id: "2", title: "Собрать референсы интерфейса", project: "Flowboard", due: "Сегодня", status: "progress", priority: "medium", progress: 65, notes: "Отобрать пять сильных примеров продуктовых интерфейсов.", tag: "Исследование" },
  { id: "3", title: "Проверить мобильную версию", project: "Портфолио", due: "5 сен", status: "progress", priority: "high", progress: 35, notes: "Проверить навигацию, карточки и горизонтальную прокрутку.", tag: "QA" },
  { id: "4", title: "Написать описание проекта", project: "Flowboard", due: "6 сен", status: "backlog", priority: "low", progress: 0, notes: "Коротко объяснить задачу, подход и результат.", tag: "Текст" },
  { id: "5", title: "Добавить превью в портфолио", project: "Портфолио", due: "7 сен", status: "backlog", priority: "medium", progress: 0, notes: "Подготовить обложку и ссылку на опубликованный проект.", tag: "Контент" },
  { id: "6", title: "Настроить автопубликацию", project: "Ember & Bean", due: "Выполнено", status: "done", priority: "medium", progress: 100, notes: "Проект подключён к публикации после каждого обновления.", tag: "Разработка" },
];

const columns: { id: Status; title: string; caption: string }[] = [
  { id: "backlog", title: "В планах", caption: "Задачи на очереди" },
  { id: "progress", title: "Делаю", caption: "Сейчас в фокусе" },
  { id: "done", title: "Готово", caption: "Результаты недели" },
];

const priorities: Record<Priority, { label: string; color: string }> = {
  high: { label: "Срочно", color: "#fb6a74" },
  medium: { label: "Важно", color: "#f2b544" },
  low: { label: "Спокойно", color: "#55b9ec" },
};

const projectColors: Record<string, string> = {
  "Ember & Bean": "#ff8a55",
  Flowboard: "#b9f459",
  Портфолио: "#9f8cff",
};

const statusOrder: Status[] = ["backlog", "progress", "done"];

const calendarDays = [
  { key: "Сегодня", weekday: "Сегодня", date: "4 сен" },
  { key: "5 сен", weekday: "Суббота", date: "5 сен" },
  { key: "6 сен", weekday: "Воскресенье", date: "6 сен" },
  { key: "7 сен", weekday: "Понедельник", date: "7 сен" },
  { key: "Без срока", weekday: "Позже", date: "Без срока" },
];

function normalizeTask(task: Task): Task {
  return {
    ...task,
    progress: task.progress ?? (task.status === "done" ? 100 : 0),
    notes: task.notes ?? "",
  };
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={direction === "left" ? "M19 12H5m5-5-5 5 5 5" : "M5 12h14m-5-5 5 5-5 5"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === "light" ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-12.72-1.42 1.42M7.06 16.94l-1.42 1.42" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 15.1A8.4 8.4 0 0 1 8.9 4a8.5 8.5 0 1 0 11.1 11.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [view, setView] = useState<View>("tasks");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [undoTask, setUndoTask] = useState<{ task: Task; index: number } | null>(null);
  const [toast, setToast] = useState("");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("Flowboard");
  const [due, setDue] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskIdCounter = useRef(initialTasks.length + 1);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = window.localStorage.getItem("flowboard-tasks");
      const savedTheme = window.localStorage.getItem("flowboard-theme") as Theme | null;
      if (saved) {
        try {
          const storedTasks = (JSON.parse(saved) as Task[]).map(normalizeTask);
          setTasks(storedTasks);
          taskIdCounter.current = storedTasks.length + 1;
        } catch {
          window.localStorage.removeItem("flowboard-tasks");
        }
      }
      setTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem("flowboard-tasks", JSON.stringify(tasks));
    window.localStorage.setItem("flowboard-theme", theme);
  }, [loaded, tasks, theme]);

  useEffect(() => {
    const closePanel = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComposerOpen(false);
        setEditingTask(null);
        setMenuTaskId(null);
      }
    };
    window.addEventListener("keydown", closePanel);
    return () => {
      window.removeEventListener("keydown", closePanel);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesText = !query || task.title.toLowerCase().includes(query) || task.project.toLowerCase().includes(query);
      const matchesProject = projectFilter === "all" || task.project === projectFilter;
      return matchesText && matchesProject && (priority === "all" || task.priority === priority);
    });
  }, [priority, projectFilter, search, tasks]);

  const completed = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "progress").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const highPriority = tasks.filter((task) => task.priority === "high" && task.status !== "done").length;
  const currentDate = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const viewMeta: Record<View, { title: string; text: string }> = {
    tasks: { title: "Сегодня в фокусе", text: "Две задачи уже в работе. Закройте главное — остальное подождёт." },
    calendar: { title: "Неделя без суеты", text: "Все ближайшие сроки в одном спокойном ритме." },
    analytics: { title: "Видимый прогресс", text: "Короткая картина недели без лишних отчётов." },
  };

  function showToast(message: string, undoable = false) {
    setToast(message);
    if (!undoable) setUndoTask(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast("");
      setUndoTask(null);
    }, undoable ? 4500 : 2600);
  }

  function moveTask(id: string, direction: -1 | 1) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const index = statusOrder.indexOf(task.status);
    const next = Math.min(statusOrder.length - 1, Math.max(0, index + direction));
    const nextStatus = statusOrder[next];
    setTasks((current) => current.map((item) => item.id === id ? { ...item, status: nextStatus, progress: nextStatus === "done" ? 100 : item.progress } : item));
    showToast(`«${task.title}» → ${columns.find((column) => column.id === nextStatus)?.title}`);
  }

  function dropTask(event: DragEvent<HTMLDivElement>, status: Status) {
    event.preventDefault();
    if (!draggedId) return;
    const task = tasks.find((item) => item.id === draggedId);
    if (task && task.status !== status) {
      setTasks((current) => {
        const moved = { ...task, status, progress: status === "done" ? 100 : task.progress };
        return [...current.filter((item) => item.id !== draggedId), moved];
      });
      showToast(`«${task.title}» перемещена`);
    }
    setDraggedId(null);
    setDragOverStatus(null);
    setDragOverTaskId(null);
  }

  function reorderTask(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedId || draggedId === targetId) return;
    setTasks((current) => {
      const moved = current.find((task) => task.id === draggedId);
      const target = current.find((task) => task.id === targetId);
      if (!moved || !target) return current;
      const next = current.filter((task) => task.id !== draggedId);
      const targetIndex = next.findIndex((task) => task.id === targetId);
      next.splice(targetIndex, 0, { ...moved, status: target.status, progress: target.status === "done" ? 100 : moved.progress });
      return next;
    });
    showToast("Порядок задач обновлён");
    setDraggedId(null);
    setDragOverTaskId(null);
    setDragOverStatus(null);
  }

  function deleteTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    const index = tasks.findIndex((item) => item.id === id);
    setTasks((current) => current.filter((item) => item.id !== id));
    setEditingTask(null);
    setMenuTaskId(null);
    if (task) {
      setUndoTask({ task, index });
      showToast(`«${task.title}» удалена`, true);
    }
  }

  function restoreTask() {
    if (!undoTask) return;
    setTasks((current) => {
      const next = [...current];
      next.splice(Math.min(undoTask.index, next.length), 0, undoTask.task);
      return next;
    });
    showToast("Задача восстановлена");
  }

  function duplicateTask(id: string) {
    const source = tasks.find((task) => task.id === id);
    if (!source) return;
    const nextId = `local-${taskIdCounter.current}`;
    taskIdCounter.current += 1;
    const copy = { ...source, id: nextId, title: `${source.title} — копия`, status: "backlog" as Status, progress: 0 };
    setTasks((current) => [...current, copy]);
    setMenuTaskId(null);
    showToast("Копия добавлена в планы");
  }

  function completeTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    setTasks((current) => current.map((item) => item.id === id ? { ...item, status: "done", progress: 100 } : item));
    setMenuTaskId(null);
    if (task) showToast(`«${task.title}» завершена`);
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const nextId = `local-${taskIdCounter.current}`;
    taskIdCounter.current += 1;
    const task: Task = {
      id: nextId,
      title: title.trim(),
      project: project.trim() || "Без проекта",
      due: due ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(`${due}T12:00:00`)) : "Без срока",
      status: "backlog",
      priority: newPriority,
      progress: 0,
      notes: "",
      tag: "Новая",
    };
    setTasks((current) => [...current, task]);
    setTitle("");
    setDue("");
    setComposerOpen(false);
    showToast("Задача добавлена в планы");
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask?.title.trim()) return;
    setTasks((current) => current.map((task) => task.id === editingTask.id ? { ...editingTask, title: editingTask.title.trim(), project: editingTask.project.trim() || "Без проекта" } : task));
    setEditingTask(null);
    showToast("Изменения сохранены");
  }

  const closePanels = () => {
    setComposerOpen(false);
    setEditingTask(null);
    setMenuTaskId(null);
  };

  return (
    <main className="app-shell min-h-screen" data-theme={theme}>
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <aside className="sidebar hidden w-[228px] shrink-0 flex-col px-5 py-6 lg:flex">
          <div className="flex items-center gap-3 px-1"><div className="brand-mark">F</div><div><p className="text-[0.95rem] font-extrabold tracking-[-0.04em] text-white">Flowboard</p><p className="mt-0.5 text-[0.68rem] text-white/35">work, but lighter</p></div></div>
          <nav className="mt-11 space-y-1.5" aria-label="Рабочее пространство">
            <button type="button" onClick={() => setView("tasks")} className={`side-link ${view === "tasks" ? "side-link-active" : ""}`}><span className="side-icon">□</span><span>Мои задачи</span><span className="side-count">{tasks.length}</span></button>
            <button type="button" onClick={() => setView("calendar")} className={`side-link ${view === "calendar" ? "side-link-active" : ""}`}><span className="side-icon">◷</span><span>Календарь</span></button>
            <button type="button" onClick={() => setView("analytics")} className={`side-link ${view === "analytics" ? "side-link-active" : ""}`}><span className="side-icon">↗</span><span>Аналитика</span></button>
          </nav>
          <div className="mt-10"><p className="px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/25">Проекты</p><div className="mt-4 space-y-1">{Object.entries(projectColors).map(([name, color]) => <button type="button" key={name} onClick={() => { setProjectFilter((current) => current === name ? "all" : name); setView("tasks"); }} className={`project-link w-full ${projectFilter === name ? "project-link-active" : ""}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span>{name}</span><span className="ml-auto text-white/25">{tasks.filter((task) => task.project === name && task.status !== "done").length}</span></button>)}</div></div>
          <div className="mt-auto"><div className="mb-5 rounded-[1.2rem] border border-white/8 bg-white/[0.035] p-4"><div className="flex items-center justify-between text-xs"><span className="text-white/45">Ритм недели</span><span className="font-mono text-[#b9f459]">{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="progress-fill h-full bg-[#b9f459]" style={{ width: `${progress}%` }} /></div></div><div className="flex items-center gap-3 border-t border-white/8 pt-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#f7d6c6] text-xs font-extrabold text-[#6e3219]">BL</div><div><p className="text-xs font-semibold text-white/85">blagone</p><p className="mt-0.5 text-[0.65rem] text-white/30">Личное пространство</p></div></div></div>
        </aside>

        <section className="workspace min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-7 lg:px-10 lg:pb-10 lg:pt-8 xl:px-12">
          <div className="mb-8 flex items-center justify-between lg:hidden"><div className="flex items-center gap-2.5"><div className="brand-mark brand-mark-small">F</div><span className="font-extrabold tracking-[-0.04em]">Flowboard</span></div><button type="button" onClick={() => setTheme((value) => value === "light" ? "dark" : "light")} className="theme-button" aria-label="Переключить тему"><ThemeIcon theme={theme} /></button></div>

          <header className="page-enter flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="eyebrow current-date">{currentDate}</p><h1 className="mt-2 text-[clamp(2.3rem,4vw,4.4rem)] font-extrabold leading-[0.95] tracking-[-0.065em]">{viewMeta[view].title}</h1><p className="muted mt-3 max-w-lg text-sm leading-6 sm:text-base">{viewMeta[view].text}</p></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => setTheme((value) => value === "light" ? "dark" : "light")} className="theme-button hidden sm:grid" aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}><ThemeIcon theme={theme} /></button><button type="button" onClick={() => setComposerOpen(true)} className="new-task-button group"><span className="plus-wrap"><PlusIcon /></span><span>Новая задача</span></button></div>
          </header>

          {view === "tasks" && <>
            <section className="overview page-enter mt-9 grid overflow-hidden md:grid-cols-[1.45fr_.72fr_.72fr]">
              <article className="flex items-center gap-6 p-5 sm:p-7"><div className="progress-ring relative grid h-[104px] w-[104px] shrink-0 place-items-center"><svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true"><circle className="ring-track" cx="50" cy="50" r="43" pathLength="100" fill="none" strokeWidth="8" /><circle className="ring-value" cx="50" cy="50" r="43" pathLength="100" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - progress} /></svg><span className="font-mono text-lg font-semibold">{progress}%</span></div><div><p className="eyebrow">Фокус недели</p><p className="mt-2 text-xl font-bold tracking-[-0.035em] sm:text-2xl">{completed} из {tasks.length} завершено</p><p className="muted mt-2 text-sm">Держите комфортный темп</p></div></article>
              <article className="stat-block p-5 md:p-7"><p className="eyebrow">В работе</p><p className="mt-4 text-4xl font-extrabold tracking-[-0.06em]">{inProgress}</p><p className="muted mt-1 text-sm">активные задачи</p></article>
              <article className="stat-block attention p-5 md:p-7"><p className="eyebrow">Нужно внимание</p><p className="mt-4 text-4xl font-extrabold tracking-[-0.06em]">{highPriority}</p><p className="muted mt-1 text-sm">высокий приоритет</p></article>
            </section>

            <div className="page-enter mt-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="search-wrap relative w-full max-w-lg"><span className="absolute inset-y-0 left-0 grid w-10 place-items-center"><SearchIcon /></span><input aria-label="Поиск по задачам" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти задачу или проект" className="w-full bg-transparent py-3 pl-10 pr-3 text-sm font-medium outline-none" /></div><div className="flex flex-wrap items-center gap-2">{projectFilter !== "all" && <button type="button" onClick={() => setProjectFilter("all")} className="project-filter">{projectFilter}<span>×</span></button>}<div className="filter-list flex flex-wrap gap-2" aria-label="Фильтр приоритетов">{(["all", "high", "medium", "low"] as const).map((value) => <button key={value} type="button" onClick={() => setPriority(value)} aria-pressed={priority === value} className={`filter-pill ${priority === value ? "filter-pill-active" : ""}`}>{value === "all" ? "Все" : priorities[value].label}</button>)}</div></div></div>

            <section className="board-scroll page-enter mt-6 grid auto-cols-[minmax(290px,86vw)] grid-flow-col gap-4 overflow-x-auto pb-5 xl:grid-flow-row xl:grid-cols-3 xl:overflow-visible">
              {columns.map((column) => {
                const columnTasks = filteredTasks.filter((task) => task.status === column.id);
                return (
                  <div key={column.id} className={`board-column board-column-${column.id} ${dragOverStatus === column.id ? "board-column-over" : ""} snap-start`} onDragOver={(event) => { event.preventDefault(); setDragOverStatus(column.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverStatus(null); }} onDrop={(event) => dropTask(event, column.id)}>
                    <div className="flex items-start justify-between px-1 pb-5"><div><h2 className="text-lg font-extrabold tracking-[-0.035em]">{column.title}</h2><p className="muted mt-1 text-xs">{column.caption}</p></div><span className="column-count">{columnTasks.length.toString().padStart(2, "0")}</span></div>
                    <div className="space-y-3">{columnTasks.map((task) => {
                      const statusIndex = statusOrder.indexOf(task.status);
                      const projectColor = projectColors[task.project] ?? "#9da19a";
                      return (
                        <article key={task.id} draggable onDragStart={() => setDraggedId(task.id)} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); if (draggedId !== task.id) setDragOverTaskId(task.id); }} onDrop={(event) => reorderTask(event, task.id)} onDragEnd={() => { setDraggedId(null); setDragOverStatus(null); setDragOverTaskId(null); }} onClick={() => { setMenuTaskId(null); setEditingTask({ ...task }); }} className={`task-card group ${draggedId === task.id ? "task-card-dragging" : ""} ${dragOverTaskId === task.id ? "task-card-drop-target" : ""}`} style={{ "--priority-color": priorities[task.priority].color } as CSSProperties}>
                          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="priority-label"><i style={{ backgroundColor: priorities[task.priority].color }} />{priorities[task.priority].label}</span>{task.tag && <span className="task-tag">{task.tag}</span>}</div><div className="task-menu-wrap"><button type="button" onClick={(event) => { event.stopPropagation(); setMenuTaskId((current) => current === task.id ? null : task.id); }} aria-label={`Меню задачи ${task.title}`} className="task-menu-button">•••</button>{menuTaskId === task.id && <div className="task-menu" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => completeTask(task.id)}>Завершить</button><button type="button" onClick={() => duplicateTask(task.id)}>Дублировать</button><button type="button" className="task-menu-danger" onClick={() => deleteTask(task.id)}>Удалить</button></div>}</div></div>
                          <h3 className={`mt-5 text-[1.02rem] font-bold leading-6 tracking-[-0.025em] ${task.status === "done" ? "task-title-done" : ""}`}>{task.title}</h3>
                          {task.progress > 0 && task.status !== "done" && <div className="task-progress mt-5"><div className="flex items-center justify-between"><span>Прогресс</span><strong>{task.progress}%</strong></div><div><i style={{ width: `${task.progress}%` }} /></div></div>}
                          <div className="mt-6 flex items-center gap-2"><span className="project-avatar" style={{ backgroundColor: projectColor }}>{task.project.slice(0, 1)}</span><span className="muted text-xs font-semibold">{task.project}</span></div>
                          <div className="task-footer mt-5 flex items-center justify-between pt-4"><span className="muted font-mono text-[0.68rem] font-medium">{task.due}</span><div className="flex gap-1.5"><button type="button" disabled={statusIndex === 0} onClick={(event) => { event.stopPropagation(); moveTask(task.id, -1); }} aria-label="Переместить задачу назад" className="move-button"><ArrowIcon direction="left" /></button><button type="button" disabled={statusIndex === statusOrder.length - 1} onClick={(event) => { event.stopPropagation(); moveTask(task.id, 1); }} aria-label="Переместить задачу вперёд" className="move-button move-button-next"><ArrowIcon direction="right" /></button></div></div>
                        </article>
                      );
                    })}{columnTasks.length === 0 && <div className="empty-state"><span>＋</span><p>Здесь свободно</p><small>Переместите сюда задачу</small></div>}</div>
                  </div>
                );
              })}
            </section>
          </>}

          {view === "calendar" && <section className="calendar-view page-enter mt-10 grid auto-cols-[minmax(250px,78vw)] grid-flow-col gap-3 overflow-x-auto pb-5 lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible">{calendarDays.map((day) => { const dayTasks = filteredTasks.filter((task) => task.due === day.key); return <article key={day.key} className="calendar-day"><div className="calendar-day-head"><p>{day.weekday}</p><span>{day.date}</span></div><div className="mt-5 space-y-2">{dayTasks.map((task) => <button type="button" key={task.id} onClick={() => setEditingTask({ ...task })} className="calendar-task"><i style={{ backgroundColor: priorities[task.priority].color }} /><span>{task.title}</span><small>{task.project}</small></button>)}{dayTasks.length === 0 && <div className="calendar-empty">Свободный день</div>}</div></article>; })}</section>}

          {view === "analytics" && <section className="analytics-grid page-enter mt-10 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
            <article className="analytics-card p-6 sm:p-8"><div className="flex items-end justify-between"><div><p className="eyebrow">Проекты</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]">Движение по направлениям</h2></div><span className="font-mono text-sm">{progress}%</span></div><div className="mt-9 space-y-7">{Object.entries(projectColors).map(([name, color]) => { const projectTasks = tasks.filter((task) => task.project === name); const projectDone = projectTasks.filter((task) => task.status === "done").length; const value = projectTasks.length ? Math.round((projectDone / projectTasks.length) * 100) : 0; return <div key={name} className="analytics-row"><div><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><b>{name}</b><small>{projectDone}/{projectTasks.length} задач</small></div><div><i style={{ width: `${value}%`, backgroundColor: color }} /></div></div>; })}</div></article>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><article className="analytics-card p-6"><p className="eyebrow">Статусы</p><div className="mt-6 flex h-3 overflow-hidden rounded-full">{columns.map((column, index) => <i key={column.id} className={`status-segment status-segment-${column.id}`} style={{ width: `${tasks.length ? (tasks.filter((task) => task.status === column.id).length / tasks.length) * 100 : 0}%` }} data-index={index} />)}</div><div className="mt-6 grid grid-cols-3 gap-2">{columns.map((column) => <div key={column.id}><strong className="text-xl">{tasks.filter((task) => task.status === column.id).length}</strong><p className="muted mt-1 text-[0.62rem]">{column.title}</p></div>)}</div></article><article className="analytics-card attention p-6"><p className="eyebrow">Сигнал недели</p><p className="mt-4 text-2xl font-extrabold tracking-[-0.04em]">{highPriority ? `${highPriority} срочная задача` : "Срочных задач нет"}</p><p className="muted mt-3 text-sm leading-6">{highPriority ? "Сначала закройте их — так неделя останется управляемой." : "Можно спокойно двигаться по текущему плану."}</p></article></div>
          </section>}

          <footer className="app-footer mt-6 flex flex-col gap-2 pt-5 text-[0.68rem] font-medium uppercase tracking-[0.12em] sm:flex-row sm:justify-between"><p>Flowboard · личный ритм работы</p><p>{loaded ? "Все изменения сохранены" : "Загружаем пространство…"}</p></footer>
        </section>
      </div>

      <nav className="mobile-nav lg:hidden" aria-label="Мобильная навигация"><button type="button" onClick={() => setView("tasks")} className={view === "tasks" ? "mobile-nav-active" : ""}><span>□</span>Задачи</button><button type="button" onClick={() => setView("calendar")} className={view === "calendar" ? "mobile-nav-active" : ""}><span>◷</span>Календарь</button><button type="button" onClick={() => setComposerOpen(true)} className="mobile-add" aria-label="Новая задача"><PlusIcon /></button><button type="button" onClick={() => setView("analytics")} className={view === "analytics" ? "mobile-nav-active" : ""}><span>↗</span>Итоги</button></nav>

      {(composerOpen || editingTask) && <div className="composer-layer fixed inset-0 z-50 flex justify-end" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closePanels(); }}>
        <aside className="composer-panel h-full w-full max-w-[470px] overflow-y-auto p-6 sm:p-9" role="dialog" aria-modal="true" aria-labelledby="panel-title">
          <div className="flex items-start justify-between"><div><p className="eyebrow">{editingTask ? "Карточка задачи" : "Новая задача"}</p><h2 id="panel-title" className="mt-3 text-3xl font-extrabold tracking-[-0.055em]">{editingTask ? "Детали и прогресс" : "Что нужно сделать?"}</h2></div><button type="button" onClick={closePanels} className="panel-close" aria-label="Закрыть панель"><CloseIcon /></button></div>
          {editingTask ? (
            <form onSubmit={saveTask} className="mt-10 space-y-6">
              <label className="form-field"><span>Задача</span><input value={editingTask.title} onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })} /></label>
              <label className="form-field"><span>Описание</span><textarea rows={4} value={editingTask.notes} onChange={(event) => setEditingTask({ ...editingTask, notes: event.target.value })} placeholder="Добавьте контекст или следующий шаг" /></label>
              <div className="grid grid-cols-2 gap-4"><label className="form-field"><span>Проект</span><input value={editingTask.project} onChange={(event) => setEditingTask({ ...editingTask, project: event.target.value })} /></label><label className="form-field"><span>Срок</span><input value={editingTask.due} onChange={(event) => setEditingTask({ ...editingTask, due: event.target.value })} /></label></div>
              <fieldset><legend className="field-legend">Статус</legend><div className="grid grid-cols-3 gap-2">{columns.map((column) => <button key={column.id} type="button" onClick={() => setEditingTask({ ...editingTask, status: column.id, progress: column.id === "done" ? 100 : editingTask.progress })} className={`priority-choice ${editingTask.status === column.id ? "priority-choice-active" : ""}`}>{column.title}</button>)}</div></fieldset>
              <fieldset><legend className="field-legend">Приоритет</legend><div className="grid grid-cols-3 gap-2">{(["low", "medium", "high"] as Priority[]).map((value) => <button key={value} type="button" onClick={() => setEditingTask({ ...editingTask, priority: value })} className={`priority-choice ${editingTask.priority === value ? "priority-choice-active" : ""}`}><i style={{ backgroundColor: priorities[value].color }} />{priorities[value].label}</button>)}</div></fieldset>
              <label className="range-field"><span><b>Прогресс</b><strong>{editingTask.progress}%</strong></span><input type="range" min="0" max="100" step="5" value={editingTask.progress} onChange={(event) => setEditingTask({ ...editingTask, progress: Number(event.target.value), status: Number(event.target.value) === 100 ? "done" : editingTask.status })} /></label>
              <button type="submit" className="submit-task"><span>Сохранить изменения</span><ArrowIcon direction="right" /></button>
              <button type="button" onClick={() => deleteTask(editingTask.id)} className="delete-task-wide">Удалить задачу</button>
            </form>
          ) : (
            <form onSubmit={addTask} className="mt-12 space-y-7"><label className="form-field"><span>Задача</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, подготовить презентацию" /></label><label className="form-field"><span>Проект</span><input value={project} onChange={(event) => setProject(event.target.value)} placeholder="Название проекта" /></label><label className="form-field"><span>Срок</span><input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label><fieldset><legend className="field-legend">Приоритет</legend><div className="grid grid-cols-3 gap-2">{(["low", "medium", "high"] as Priority[]).map((value) => <button key={value} type="button" onClick={() => setNewPriority(value)} className={`priority-choice ${newPriority === value ? "priority-choice-active" : ""}`}><i style={{ backgroundColor: priorities[value].color }} />{priorities[value].label}</button>)}</div></fieldset><button type="submit" className="submit-task"><span>Добавить задачу</span><ArrowIcon direction="right" /></button></form>
          )}
        </aside>
      </div>}

      <div className={`toast ${toast ? "toast-visible" : ""}`} role="status" aria-live="polite"><span>✓</span><p>{toast}</p>{undoTask && <button type="button" onClick={restoreTask}>Отменить</button>}</div>
    </main>
  );
}
