"use client";

import { useActionState } from "react";
import { addAvailabilitySlot, deleteAvailabilitySlot, type AvailabilityState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAY_LABELS } from "@/lib/timezone";

type Slot = {
  id: string;
  dayOfWeek: number;
  dayLabel: string;
  startTime: string;
  endTime: string;
};

const initialState: AvailabilityState = {};

export function AvailabilitySection({
  slots,
  timezone,
}: {
  slots: Slot[];
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(
    addAvailabilitySlot,
    initialState
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-medium">Weekly availability</h2>
        <p className="text-sm text-muted-foreground">
          Times shown in your timezone ({timezone}); stored in UTC.
        </p>
      </div>

      {slots.length > 0 && (
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {slot.dayLabel}, {slot.startTime}–{slot.endTime}
              </span>
              <form action={deleteAvailabilitySlot}>
                <input type="hidden" name="id" value={slot.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="dayOfWeek">Day</Label>
          <Select name="dayOfWeek" defaultValue="1">
            <SelectTrigger id="dayOfWeek">
              {/* Base UI's Select.Value shows the raw value unless told
                  how to render it -- unlike Radix, it doesn't infer the
                  label from the matching SelectItem's children. */}
              <SelectValue>
                {(value: string) => DAY_LABELS[Number(value)]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DAY_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">Start</Label>
          <Input id="startTime" name="startTime" type="time" required defaultValue="09:00" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End</Label>
          <Input id="endTime" name="endTime" type="time" required defaultValue="10:00" />
        </div>

        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? "Adding..." : "Add slot"}
        </Button>
      </form>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </section>
  );
}
