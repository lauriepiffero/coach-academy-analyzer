import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../../../lib/system-prompt.js";

export const maxDuration = 300; // Allow up to 2 minutes for long analyses

export async function POST(req) {
  try {
    const { transcript, coachName } = await req.json();

    if (!transcript || transcript.trim().length < 100) {
      return Response.json(
        { error: "La transcription est trop courte. Colle le texte complet de la séance." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userMessage = coachName
      ? `Voici la transcription d'une séance de coaching réalisée par ${coachName}. Analyse-la selon la grille complète.\n\n---\n\n${transcript}`
      : `Voici la transcription d'une séance de coaching. Analyse-la selon la grille complète.\n\n---\n\n${transcript}`;

    // Stream the response
    const stream = await client.messages.stream({
      model: "claude-opus-4-20250514",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Convert to a ReadableStream for the frontend
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err.message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "Erreur serveur. Réessaie dans un moment." },
      { status: 500 }
    );
  }
}
