import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
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

export function NewProjectPage() {
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
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
      const project = await createProject.mutateAsync(parsed);
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
    <main className="mx-auto max-w-2xl p-6">
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
