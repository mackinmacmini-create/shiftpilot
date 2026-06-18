"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createAvailabilityWindow } from "@/lib/actions/availability";

const schema = z.object({
  label: z.string().optional(),
  start_at: z.string().min(1, "Required"),
  end_at: z.string().min(1, "Required"),
  recurrence_rule: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const RECURRENCE_OPTIONS = [
  { value: "", label: "No recurrence (one time)" },
  { value: "RRULE:FREQ=DAILY", label: "Every day" },
  { value: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", label: "Every weekday" },
  { value: "RRULE:FREQ=WEEKLY;BYDAY=SA,SU", label: "Every weekend" },
  { value: "RRULE:FREQ=WEEKLY;BYDAY=MO", label: "Every Monday" },
  { value: "RRULE:FREQ=WEEKLY;BYDAY=WE,FR", label: "Every Wed & Fri" },
  { value: "RRULE:FREQ=WEEKLY", label: "Weekly (same day)" },
];

interface ReminderWindowPickerProps {
  onSuccess?: () => void;
}

export function ReminderWindowPicker({ onSuccess }: ReminderWindowPickerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const result = await createAvailabilityWindow({
      start_at: values.start_at,
      end_at: values.end_at,
      recurrence_rule: values.recurrence_rule || null,
      label: values.label,
    });

    if (!result.error) {
      reset();
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="label">Label (optional)</Label>
        <Input id="label" placeholder="e.g. Morning shift window" {...register("label")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_at">Start</Label>
          <Input id="start_at" type="datetime-local" {...register("start_at")} />
          {errors.start_at && (
            <p className="mt-1 text-xs text-red-400">{errors.start_at.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="end_at">End</Label>
          <Input id="end_at" type="datetime-local" {...register("end_at")} />
          {errors.end_at && <p className="mt-1 text-xs text-red-400">{errors.end_at.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="recurrence_rule">Repeat</Label>
        <Select id="recurrence_rule" {...register("recurrence_rule")}>
          {RECURRENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[10px] text-slate-500">
          Recurring windows generate reminders ahead of each occurrence.
        </p>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Add Window
      </Button>
    </form>
  );
}
