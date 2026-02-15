import JSZip from "jszip";
import type { CompiledFile } from "./compiler-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workflow";
}

export async function downloadCompiledZip(
  files: CompiledFile[],
  workflowName: string
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const fileName = `${slugify(workflowName)}-cre-bundle.zip`;
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}
