"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/types/database";

type SkillCategory = Database["public"]["Tables"]["skill_categories"]["Row"];
type Skill = Database["public"]["Tables"]["skills"]["Row"];

export function SearchFilters({
  categories,
  skills,
  canFilterByOverlap,
  selected,
}: {
  categories: SkillCategory[];
  skills: Skill[];
  canFilterByOverlap: boolean;
  selected: { skillId?: string; language?: string; overlapOnly?: string };
}) {
  return (
    // GET so filters live in the URL (shareable/back-button friendly) and
    // the whole page stays server-rendered -- no client-side fetch needed.
    <form method="GET" className="flex flex-wrap items-end gap-3 rounded-md border p-4">
      <div className="space-y-2">
        <Label htmlFor="skillId">Skill</Label>
        <Select name="skillId" defaultValue={selected.skillId ?? "any"}>
          <SelectTrigger id="skillId" className="w-48">
            <SelectValue>
              {(value: string) =>
                value === "any" ? "Any skill" : skills.find((s) => s.id === value)?.name
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any skill</SelectItem>
            {categories.map((category) => {
              const categorySkills = skills.filter((s) => s.category_id === category.id);
              if (categorySkills.length === 0) return null;
              return (
                <SelectGroup key={category.id}>
                  <SelectLabel>{category.name}</SelectLabel>
                  {categorySkills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
        <Input
          id="language"
          name="language"
          defaultValue={selected.language}
          placeholder="e.g. Spanish"
          className="w-40"
        />
      </div>

      <div className="pb-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="overlapOnly"
            name="overlapOnly"
            defaultChecked={selected.overlapOnly === "on"}
            disabled={!canFilterByOverlap}
          />
          <Label htmlFor="overlapOnly" className="font-normal">
            Only show mentors free when I am
          </Label>
        </div>
        {!canFilterByOverlap && (
          <p className="text-xs text-muted-foreground">
            Set your availability on your profile to use this filter.
          </p>
        )}
      </div>

      <Button type="submit">Search</Button>
    </form>
  );
}
