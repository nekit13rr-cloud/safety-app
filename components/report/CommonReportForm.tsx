"use client";

import { useMemo, useState } from "react";
import { getHazardsByRisk, RISK_OPTIONS } from "../../lib/report-catalog";

type CommonReportFormProps = {
  title: string;
  submitLabel?: string;
  type: "danger" | "behavior" | "incident";
  extraFields?: React.ReactNode;
};

export default function CommonReportForm({
  title,
  submitLabel = "Отправить",
  type,
  extraFields,
}: CommonReportFormProps) {
  const [risk, setRisk] = useState("");
  const [hazard, setHazard] = useState("");
  const [unsafeCondition, setUnsafeCondition] = useState("");
  const [unsafeAction, setUnsafeAction] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [place, setPlace] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const hazards = useMemo(() => getHazardsByRisk(risk), [risk]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      if (!risk) throw new Error("Выберите риск");
      if (!hazard) throw new Error("Выберите опасность");
      if (!eventDate) throw new Error("Укажите дату");
      if (!eventTime) throw new Error("Укажите время");
      if (!place.trim()) throw new Error("Укажите место");

      console.log({
        type,
        risk,
        hazard,
        unsafeCondition,
        unsafeAction,
        eventDate,
        eventTime,
        place,
        responsibleId,
        filesCount: files?.length || 0,
      });

      setMessage("Форма заполнена. Следующим шагом подключим сохранение в БД.");
    } catch (err: any) {
      setMessage(err.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0614] text-white">
      <div className="mx-auto max-w-[1100px] px-4 py-8">
        <header className="mb-6 rounded-3xl border border-white/10 bg-[#1a1233] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-300">
            Форма регистрации
          </div>
          <h1 className="mt-3 text-3xl font-bold">{title}</h1>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-[#1a1233] p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormSelect
              label="Риск"
              value={risk}
              onChange={(value) => {
                setRisk(value);
                setHazard("");
              }}
              options={RISK_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
            />

            <FormSelect
              label="Опасность"
              value={hazard}
              onChange={setHazard}
              options={hazards.map((item) => ({
                value: item,
                label: item,
              }))}
              disabled={!risk}
            />

            <FormInput
              label="Дата события"
              type="date"
              value={eventDate}
              onChange={setEventDate}
            />

            <FormInput
              label="Время события"
              type="time"
              value={eventTime}
              onChange={setEventTime}
            />

            <FormInput
              label="Место события"
              value={place}
              onChange={setPlace}
              placeholder="Укажите место"
            />

            <FormInput
              label="Ответственный исполнитель"
              value={responsibleId}
              onChange={setResponsibleId}
              placeholder="Будет заменено на выпадающий список"
            />
          </div>

          <div className="mt-4 grid gap-4">
            <FormTextarea
              label="Небезопасные условия"
              value={unsafeCondition}
              onChange={setUnsafeCondition}
            />

            <FormTextarea
              label="Небезопасные действия"
              value={unsafeAction}
              onChange={setUnsafeAction}
            />
          </div>

          {extraFields ? <div className="mt-4">{extraFields}</div> : null}

          <div className="mt-4">
            <div className="mb-1.5 text-sm text-slate-300">Фото / видео доказательства</div>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full rounded-xl border border-white/10 bg-[#0b0820] px-3 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-purple-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </div>

          {message ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0820] px-4 py-3 text-sm text-slate-200">
              {message}
            </div>
          ) : null}

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Сохранение..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-[#0b0820] px-3 text-sm text-white outline-none"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-slate-300">{label}</div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0b0820] px-3 py-3 text-sm text-white outline-none"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-slate-300">{label}</div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-[#0b0820] px-3 text-sm text-white outline-none disabled:opacity-50"
      >
        <option value="" className="bg-slate-900">
          Выберите
        </option>
        {options.map((item) => (
          <option key={item.value} value={item.value} className="bg-slate-900">
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}