import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router";

import { PRESETS, type Preset } from "@flow-ex/shared-schemas";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import { useCreateProject } from "../hooks/use-create-project";
import { ApiError } from "../lib/api-client";

const PLACEHOLDER = `{
  "title": "Cau chuyen mua he",
  "voice": "hn_female_ngochuyen_full_48k-fhg",
  "aspectRatio": "16:9",
  "reviewEnabled": true,
  "scenes": [
    { "narration": "Xin chao", "imagePrompt": "a sunny beach at dawn" }
  ]
}`;

/** Task 009: only injects `preset` into the submitted payload when the user actually touches the
 * picker (`selectedPreset !== null`) — a script that already sets its own `aspectRatio`/`preset`
 * explicitly must be submitted unchanged, since the picker is an OPTIONAL convenience over the
 * raw JSON, never a silent override of what the user typed. */
function withSelectedPreset(parsed: unknown, selectedPreset: Preset | null): unknown {
  if (selectedPreset === null || typeof parsed !== "object" || parsed === null) {
    return parsed;
  }
  return { ...parsed, preset: selectedPreset };
}

export function NewProjectPage() {
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const createProject = useCreateProject();
  const navigate = useNavigate();

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setParseError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setParseError("JSON không hợp lệ. Kiểm tra lại dấu ngoặc/nháy.");
      return;
    }

    try {
      const project = await createProject.mutateAsync(withSelectedPreset(parsed, selectedPreset));
      void navigate(`/projects/${project.id}`);
    } catch {
      // createProject.error already holds the failure for the UI below.
    }
  }

  const submitError =
    parseError ??
    (createProject.error instanceof ApiError
      ? createProject.error.message
      : createProject.error?.message);

  return (
    <main className="w-full max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Dự án mới: dán kịch bản JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label>Preset (tùy chọn, ghi đè lên preset/aspectRatio trong JSON)</Label>
              <RadioGroup
                value={selectedPreset ?? undefined}
                onValueChange={(value) => setSelectedPreset(value as Preset)}
                className="grid-cols-2"
              >
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="tiktok" />
                  TikTok ({String(PRESETS.tiktok.suggestedDuration.min)}-
                  {String(PRESETS.tiktok.suggestedDuration.max)}s,{" "}
                  {String(PRESETS.tiktok.suggestedSceneCount.min)}-
                  {String(PRESETS.tiktok.suggestedSceneCount.max)} scene)
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="youtube" />
                  YouTube ({String(PRESETS.youtube.suggestedDuration.min)}-
                  {String(PRESETS.youtube.suggestedDuration.max)}s,{" "}
                  {String(PRESETS.youtube.suggestedSceneCount.min)}-
                  {String(PRESETS.youtube.suggestedSceneCount.max)} scene)
                </Label>
              </RadioGroup>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="script-json">Kịch bản (JSON)</Label>
              <Textarea
                id="script-json"
                value={rawJson}
                onChange={(event) => setRawJson(event.target.value)}
                placeholder={PLACEHOLDER}
                rows={16}
                className="font-mono text-xs"
              />
            </div>
            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            <Button type="submit" disabled={createProject.isPending || rawJson.trim().length === 0}>
              {createProject.isPending ? "Đang tạo..." : "Tạo dự án"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
