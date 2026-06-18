"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createDesiredBlock } from "@/lib/actions/wishlist";
import { DOW_LABELS, PLATFORM_LABELS } from "@/lib/utils";
import type { Station } from "@/lib/types/db";

const schema = z.object({
  station_id: z.string().optional(),
  day_of_week: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  min_pay_display: z.string().optional(),
  min_duration_minutes: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface WishlistEditorProps {
  stations: Station[];
  onSuccess?: () => void;
}

export function WishlistEditor({ stations, onSuccess }: WishlistEditorProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const result = await createDesiredBlock({
      station_id: values.station_id || null,
      day_of_week: values.day_of_week ? parseInt(values.day_of_week) : null,
      start_time: values.start_time || null,
      end_time: values.end_time || null,
      min_pay_cents: values.min_pay_display
        ? Math.round(parseFloat(values.min_pay_display) * 100)
        : null,
      min_duration_minutes: values.min_duration_minutes
        ? parseInt(values.min_duration_minutes)
        : null,
      notes: values.notes,
    });

    if (!result.error) {
      reset();
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="station_id">Preferred Station (optional)</Label>
        <Select id="station_id" {...register("station_id")}>
          <option value="">Any station</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name} ({PLATFORM_LABELS[s.platform] ?? s.platform})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="day_of_week">Preferred Day (optional)</Label>
        <Select id="day_of_week" {...register("day_of_week")}>
          <option value="">Any day</option>
          {DOW_LABELS.map((day, i) => (
            <option key={i} value={i}>
              {day}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Earliest Start</Label>
          <Input id="start_time" type="time" {...register("start_time")} />
        </div>
        <div>
          <Label htmlFor="end_time">Latest End</Label>
          <Input id="end_time" type="time" {...register("end_time")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="min_pay_display">Min Pay ($)</Label>
          <Input
            id="min_pay_display"
            type="number"
            step="0.50"
            min="0"
            placeholder="e.g. 25.00"
            {...register("min_pay_display")}
          />
        </div>
        <div>
          <Label htmlFor="min_duration_minutes">Min Duration (min)</Label>
          <Input
            id="min_duration_minutes"
            type="number"
            step="15"
            min="30"
            placeholder="e.g. 120"
            {...register("min_duration_minutes")}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="e.g. Only weekday mornings near Doral" {...register("notes")} />
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Save Wishlist Rule
      </Button>
    </form>
  );
}
