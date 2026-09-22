"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/types/database";

type SkillCategory = Database["public"]["Tables"]["skill_categories"]["Row"];
type Skill = Database["public"]["Tables"]["skills"]["Row"];

export function SkillsPicker({
  title,
  description,
  categories,
  skills,
  selectedSkillIds,
  formAction,
}: {
  title: string;
  description: string;
  categories: SkillCategory[];
  skills: Skill[];
  selectedSkillIds: string[];
  formAction: (formData: FormData) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState(new Set(selectedSkillIds));
  const idPrefix = useId();

  function toggle(skillId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(skillId);
      else next.delete(skillId);
      return next;
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <form action={formAction} className="space-y-4">
        {categories.map((category) => {
          const categorySkills = skills.filter((s) => s.category_id === category.id);
          if (categorySkills.length === 0) return null;
          return (
            <div key={category.id}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {category.name}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categorySkills.map((skill) => {
                  const inputId = `${idPrefix}-${skill.id}`;
                  const checked = selected.has(skill.id);
                  return (
                    <div key={skill.id} className="flex items-center gap-2">
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        onCheckedChange={(value) => toggle(skill.id, value === true)}
                      />
                      {checked && (
                        <input type="hidden" name="skillIds" value={skill.id} />
                      )}
                      <Label htmlFor={inputId} className="font-normal">
                        {skill.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <Button type="submit" variant="secondary">
          Save
        </Button>
      </form>
    </section>
  );
}
