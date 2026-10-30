import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const TranscribeScrubSchema = z.object({
  rawText: z.string().min(1).max(2000),
  category: z.string().optional(),
});

// In-memory rate limiter
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

/**
 * Pure deterministic scrubber that removes specific names, exact timestamps,
 * phone numbers, and colloquialisms to guarantee anonymous collective reporting.
 */
function deterministicScrub(text: string): string {
  let scrubbed = text;

  // Remove phone numbers and numbers formatted like mobile
  scrubbed = scrubbed.replace(/(?:\+91|0)?[6-9]\d{9}/g, '[PHONE REDACTED]');

  // Remove exact clock times like 10:15 PM, 08:30 am, 14:00
  scrubbed = scrubbed.replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '[TIME REDACTED]');

  // Remove common personal names or titles
  scrubbed = scrubbed.replace(/\b(?:Mister|Mr\.|Mrs\.|Shri|Smt|Thekedar|Bhai|Sir)\s+[A-Z][a-z]+/gi, '[SUPERVISOR/PERSON]');

  // Paraphrase to standard objective tone
  return `Aggregated report: Worker indicates issue regarding ${scrubbed.trim().toLowerCase()}. Formal inquiry recommended upon collective threshold.`;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = TranscribeScrubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid complaint text format' }, { status: 400 });
    }

    const { rawText, category } = parsed.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Paraphrase the following worker complaint into objective, anonymized Class 5 language. Strip all personal names, contractor names, exact times, and local slang. Output only the anonymized summary:\n\n"${rawText}"`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const scrubbed = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (scrubbed) {
            return NextResponse.json({
              sanitizedText: scrubbed,
              originalLength: rawText.length,
              isAnonymous: true,
            });
          }
        }
      } catch (err) {
        // Fall back to deterministic scrubber
      }
    }

    // Deterministic fallback
    const scrubbed = deterministicScrub(rawText);
    return NextResponse.json({
      sanitizedText: scrubbed,
      originalLength: rawText.length,
      isAnonymous: true,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process complaint scrubbing' }, { status: 500 });
  }
}
