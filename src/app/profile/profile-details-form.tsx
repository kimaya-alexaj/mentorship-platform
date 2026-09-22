"use client";

import { useActionState } from "react";
import { updateProfileDetails, type ProfileDetailsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const initialState: ProfileDetailsState = {};

export function ProfileDetailsForm({
  profile,
  contactEmail,
  timezones,
}: {
  profile: Profile;
  contactEmail: string;
  timezones: string[];
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileDetails,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="isMentor"
            name="isMentor"
            defaultChecked={profile.is_mentor}
          />
          <Label htmlFor="isMentor" className="font-normal">
            I want to be a mentor
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="isMentee"
            name="isMentee"
            defaultChecked={profile.is_mentee}
          />
          <Label htmlFor="isMentee" className="font-normal">
            I want to be a mentee
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          rows={4}
          placeholder="A little about you and what you're looking for."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select name="timezone" defaultValue={profile.timezone}>
          <SelectTrigger id="timezone" className="w-full">
            {/* No render-prop needed here: unlike the day-of-week select,
                the item value *is* the display label (the IANA name). */}
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="languages">Languages</Label>
        <Input
          id="languages"
          name="languages"
          defaultValue={profile.languages.join(", ")}
          placeholder="English, Spanish"
        />
        <p className="text-xs text-muted-foreground">Comma-separated.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={contactEmail}
          required
        />
        <p className="text-xs text-muted-foreground">
          Only shared with a mentor/mentee after you both accept a match.
        </p>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
