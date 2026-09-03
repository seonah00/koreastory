export async function runOpenAISpeech({
  apiKey,
  model,
  input,
  voice,
  instructions,
  speed,
}: {
  apiKey: string;
  model: string;
  input: string;
  voice: string;
  instructions: string;
  speed: number;
}) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      voice,
      instructions,
      speed,
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `OpenAI speech generation failed: ${message.slice(0, 1000)}`,
    );
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.byteLength) throw new Error("OpenAI returned empty speech audio.");
  return { bytes };
}
