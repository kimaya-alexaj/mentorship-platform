"use client";

import { useActionState } from "react";
import { sendRequest, type SendRequestState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/types/database";

type Skill = Database["public"]["Tables"]["skills"]["Row"];

const initialState: SendRequestState = {};

export function RequestForm({ mentorId, skills }: { mentorId: string; skills: Skill[] }) {
  const [state, formAction, pending] = useActionState(
    sendRequest.bind(null, mentorId),
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      {skills.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="skillId">What would you like help with? (optional)</Label>
          <Select name="skillId">
            <SelectTrigger id="skillId" className="w-full">
              <SelectValue>
                {(value: string) => skills.find((s) => s.id === value)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {skills.map((skill) => (
                <SelectItem key={skill.id} value={skill.id}>
                  {skill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="Introduce yourself and say what you're hoping to learn."
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send request"}
      </Button>
    </form>
  );
}
