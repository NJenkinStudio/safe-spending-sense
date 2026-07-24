import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavControls } from "../nav-controls";
import type { OnboardingProfile } from "@/lib/onboarding/types";

const AGE_RANGES = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"];
const EMPLOYMENT = [
  { v: "full-time", l: "Full time" },
  { v: "part-time", l: "Part time" },
  { v: "self-employed", l: "Self-employed" },
  { v: "student", l: "Student" },
  { v: "retired", l: "Retired" },
  { v: "not-employed", l: "Not currently employed" },
];

export function AboutYouStep({
  profile,
  onChange,
  onNext,
  busy,
}: {
  profile: OnboardingProfile;
  onChange: (p: OnboardingProfile) => void;
  onNext: () => void;
  busy?: boolean;
}) {
  const valid = profile.first_name.trim() && profile.last_name.trim();
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Let's start with you</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A little context helps Cadence speak to you like a person, not a spreadsheet.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>First name</Label>
          <Input value={profile.first_name} onChange={(e) => onChange({ ...profile, first_name: e.target.value })} />
        </div>
        <div>
          <Label>Last name</Label>
          <Input value={profile.last_name} onChange={(e) => onChange({ ...profile, last_name: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>
            Preferred display name <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            placeholder="What should Cadence call you?"
            value={profile.preferred_name}
            onChange={(e) => onChange({ ...profile, preferred_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Age range</Label>
          <Select value={profile.age_range} onValueChange={(v) => onChange({ ...profile, age_range: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {AGE_RANGES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Employment status</Label>
          <Select value={profile.employment_status} onValueChange={(v) => onChange({ ...profile, employment_status: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {EMPLOYMENT.map((e) => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>
            Occupation <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. Nurse, Software engineer, Teacher, Other"
            value={profile.occupation}
            onChange={(e) => onChange({ ...profile, occupation: e.target.value })}
          />
        </div>
      </div>
      <NavControls onNext={onNext} disabled={!valid} busy={busy} nextLabel="Continue" />
    </Card>
  );
}