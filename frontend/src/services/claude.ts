export async function askClaude(message: string): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}
