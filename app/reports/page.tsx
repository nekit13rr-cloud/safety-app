"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ReportStatus = "new" | "in_progress" | "resolved";

type ReportRow = {
  id: string;
  report_number: number | null;
  employee_user_id: string | null;
  employee_full_name: string | null;
  employee_position: string | null;
  employee_area: string | null;
  employee_department: string | null;
  report_type: string | null;
  description: string | null;
  unsafe_condition_text: string | null;
  unsafe_action_text: string | null;
  photo_url: string | null;
  status: ReportStatus | null;
  priority: string | null;
  responsible_user_id: string | null;
  responsible_comment: string | null;
  deadline_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export default function ResponsibleDashboardPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);

      const authRes = await supabase.auth.getUser();
      const user = authRes.data.user;

      if (authRes.error) {
        throw new Error(`auth: ${authRes.error.message}`);
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const profileRes = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (profileRes.error) {
        throw new Error(`profiles: ${profileRes.error.message}`);
      }

      if (!profileRes.data) {
        throw new Error("profiles: профиль пользователя не найден");
      }

      if (profileRes.data.role !== "responsible") {
        throw new Error(`access: role = ${profileRes.data.role}`);
      }

      const reportsRes = await supabase
        .from("reports")
        .select(`
          id,
          report_number,
          employee_user_id,
          employee_full_name,
          employee_position,
          employee_area,
          employee_department,
          report_type,
          description,
          unsafe_condition_text,
          unsafe_action_text,
          photo_url,
          status,
          priority,
          responsible_user_id,
          responsible_comment,
          deadline_at,
          resolved_at,
          closed_at,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });

      if (reportsRes.error) {
        throw new Error(`reports: ${reportsRes.error.message}`);
      }

      setReports((reportsRes.data ?? []) as ReportRow[]);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : `unknown error: ${JSON.stringify(e)}`;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: ReportStatus) {
    const { error: updateError } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      setError(`update: ${updateError.message}`);
      return;
    }

    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );

    if (selected?.id === id) {
      setSelected({ ...selected, status });
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTypeLabel(type: string | null) {
    if (!type) return "Не указан";

    switch (type) {
      case "danger":
        return "Опасность";
      case "unsafe_condition":
        return "Небезопасное условие";
      case "unsafe_action":
        return "Небезопасное действие";
      default:
        return type;
    }
  }

  function getPriorityLabel(priority: string | null) {
    if (!priority) return "Не указан";

    switch (priority) {
      case "low":
        return "Низкий";
      case "medium":
        return "Средний";
      case "high":
        return "Высокий";
      case "critical":
        return "Критический";
      default:
        return priority;
    }
  }

  if (loading) return <div className="p-6">Загрузка...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
              Панель ответственного
            </p>
            <h1 className="mt-2 text-4xl font-bold">Реестр нарушений</h1>
            <p className="mt-3 text-slate-200">
              Просмотр нарушений, контроль статусов и работа с карточками.
            </p>
          </div>

          <button
            onClick={() => void loadReports()}
            className="rounded-2xl bg-white/15 px-5 py-3 text-sm font-medium hover:bg-white/25"
          >
            Обновить
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Всего</div>
          <div className="mt-2 text-3xl font-bold">{reports.length}</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Новые</div>
          <div className="mt-2 text-3xl font-bold">
            {reports.filter((r) => (r.status ?? "new") === "new").length}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">В работе</div>
          <div className="mt-2 text-3xl font-bold">
            {reports.filter((r) => r.status === "in_progress").length}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Закрытые</div>
          <div className="mt-2 text-3xl font-bold">
            {reports.filter((r) => r.status === "resolved").length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Список нарушений</h2>
            <p className="text-sm text-slate-500">Найдено: {reports.length}</p>
          </div>

          <div className="max-h-[650px] overflow-auto">
            {reports.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                Нарушения не найдены
              </div>
            ) : (
              reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className="w-full border-b p-4 text-left hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">
                        {r.employee_full_name || "Без имени"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {r.employee_position || "Без должности"} •{" "}
                        {r.employee_area || "Без участка"}
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {r.description || "Описание не указано"}
                      </div>
                    </div>

                    <div className="text-right text-sm text-slate-500">
                      <div>{getTypeLabel(r.report_type)}</div>
                      <div className="mt-1">{formatDate(r.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500">Карточка нарушения</div>
                <h2 className="mt-1 text-2xl font-bold">
                  {selected.employee_full_name || "Без имени"}
                </h2>
                <div className="mt-1 text-sm text-slate-500">
                  {selected.employee_position || "Без должности"} •{" "}
                  {selected.employee_area || "Без участка"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-400">Номер</div>
                  <div className="mt-1 font-medium">
                    {selected.report_number ?? "—"}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-400">Тип</div>
                  <div className="mt-1 font-medium">
                    {getTypeLabel(selected.report_type)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-400">Приоритет</div>
                  <div className="mt-1 font-medium">
                    {getPriorityLabel(selected.priority)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-400">Создано</div>
                  <div className="mt-1 font-medium">
                    {formatDate(selected.created_at)}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Описание</div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  {selected.description || "Описание не указано"}
                </div>
              </div>

              {selected.unsafe_condition_text ? (
                <div>
                  <div className="mb-2 text-sm font-medium">
                    Небезопасное условие
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    {selected.unsafe_condition_text}
                  </div>
                </div>
              ) : null}

              {selected.unsafe_action_text ? (
                <div>
                  <div className="mb-2 text-sm font-medium">
                    Небезопасное действие
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    {selected.unsafe_action_text}
                  </div>
                </div>
              ) : null}

              {selected.photo_url ? (
                <div>
                  <div className="mb-2 text-sm font-medium">Фото</div>
                  <img
                    src={selected.photo_url}
                    alt="Фото нарушения"
                    className="h-64 w-full rounded-2xl object-cover"
                  />
                </div>
              ) : null}

              <div>
                <div className="mb-2 text-sm font-medium">Статус</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void updateStatus(selected.id, "new")}
                    className="rounded-xl bg-gray-200 px-3 py-2 text-sm"
                  >
                    Новая
                  </button>
                  <button
                    onClick={() => void updateStatus(selected.id, "in_progress")}
                    className="rounded-xl bg-yellow-200 px-3 py-2 text-sm"
                  >
                    В работе
                  </button>
                  <button
                    onClick={() => void updateStatus(selected.id, "resolved")}
                    className="rounded-xl bg-green-200 px-3 py-2 text-sm"
                  >
                    Закрыта
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed text-sm text-slate-500">
              Выбери нарушение слева
            </div>
          )}
        </div>
      </div>
    </div>
  );
}