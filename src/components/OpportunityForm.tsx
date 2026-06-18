"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createOpportunity } from "@/lib/actions/opportunities";
import type { Station } from "@/lib/types/db";

const schema = z.object({
  station_id: z.string().optional(),
  observed_at: z.string().optional(),
  start_at: z.string().min(1, "Required"),
  end_at: z.string().min(1, "Required"),
  offered_pay_cents_display: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount"),
  outcome: z.enum(["grabbed", "passed", "missed", "cancelled"]),
  source: z.enum(["app", "reminder", "manual"]).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface OpportunityFormProps {
  stations: Station[];
  onSuccess?: () => void;
}

export function OpportunityForm({ stations, onSuccess }: OpportunityFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { outcome: "grabbed", source: "manual" },
  });

  async function onSubmit(values: FormValues) {
    const offered_pay_cents = Math.round(parseFloat(values.offered_pay_cents_display) * 100);

    const result = await createOpportunity({
      station_id: values.station_id || null,
      observed_at: values.observed_at || undefined,
      start_at: values.start_at,
      end_at: values.end_at,
      offered_pay_cents,
      outcome: values.outcome,
      source: values.source ?? "manual",
      notes: values.notes,
    });

    if (!result.error) {
      reset();
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_at">Block Start</Label>
          <Input id="start_at" type="datetime-local" {...register("start_at")} />
          {errors.start_at && <p className="mt-1 text-xs text-red-400">{errors.start_at.message}</p>}
        </div>
        <div>
          <Label htmlFor="end_at">Block End</Label>
          <Input id="end_at" type="datetime-local" {...register("end_at")} />
          {errors.end_at && <p className="mt-1 text-xs text-red-400">{errors.end_at.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="offered_pay_cents_display">Offered Pay ($)</Label>
        <Input
          id="offered_pay_cents_display"
          type="number"
          step="0.01"
          min="0"
          placeholder="24.50"
          {...register("offered_pay_cents_display")}
        />
        {errors.offered_pay_cents_display && (
          <p className="mt-1 text-xs text-red-400">{errors.offered_pay_cents_display.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="outcome">Outcome</Label>
        <Select id="outcome" {...register("outcome")}>
          <option value="grabbed">Grabbed</option>
          <option value="passed">Passed</option>
          <option value="missed">Missed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="station_id">Station (optional)</Label>
        <Select id="station_id" {...register("station_id")}>
          <option value="">No station</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="source">How did you find out?</Label>
        <Select id="source" {...register("source")}>
          <option value="manual">Checked app myself</option>
          <option value="reminder">Got a ShiftPilot reminder</option>
          <option value="app">Push notification from gig app</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="observed_at">When did you see this? (optional)</Label>
        <Input id="observed_at" type="datetime-local" {...register("observed_at")} />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Optional notes..." {...register("notes")} />
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Log Opportunity
      </Button>
    </form>
  );
}
