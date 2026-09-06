import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
// Mount body parsers BEFORE any endpoint routes
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Lazy GoogleGenAI client accessor to prevent crashes on startup
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder according to Production Directives
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
] as const;

interface FallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Executes content generation using an automated fallback ladder ordered by availability and latency.
 * Catches 503, 429, 404, 500 status codes and tries the next model in sequence.
 */
async function generateContentWithFallback(
  contents: string | Array<{ role?: string; text?: string; parts?: Array<{ text: string }> }>,
  systemInstruction?: string
): Promise<FallbackResult> {
  const ai = getAIClient();
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: contents as any,
        config: systemInstruction
          ? {
              systemInstruction,
              temperature: 0.7,
            }
          : {
              temperature: 0.7,
            },
      });

      const responseText = response.text;
      if (typeof responseText === 'string') {
        return {
          text: responseText,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || (err?.message?.includes('503') ? 503 : 0);
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        status === 'UNAVAILABLE' ||
        status === 'RESOURCE_EXHAUSTED' ||
        /unavailable|quota|rate limit|overloaded|not found/i.test(err?.message || '');

      console.warn(
        `[Gemini Resilience] Generation failed on model '${model}'. Recoverable: ${isRecoverable}. Error: ${err?.message}`
      );

      if (!isRecoverable && model === MODEL_FALLBACK_LADDER[0]) {
        // If it's a fatal validation or auth error, trying other models might not help, but try next if available
        continue;
      }
    }
  }

  throw new Error(
    `All Gemini fallback models exhausted. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

// ================= API ROUTES =================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * POST /api/gemini/reflect
 * Multi-turn reflection and empathetic feedback on journal entries
 */
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
    const mode = typeof data.mode === 'string' ? data.mode : 'reflection';
    const rawHistory = Array.isArray(data.history) ? data.history : [];

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required and must not be empty.' });
      return;
    }

    if (prompt.length > 8000) {
      res.status(400).json({ error: 'Prompt exceeds the 8,000 character limit.' });
      return;
    }

    // Treat user input as plain data (Indirect Prompt Injection Defense)
    const systemPromptByMode: Record<string, string> = {
      reflection:
        'You are an insightful, empathetic, and thoughtful personal reflection companion. ' +
        'Help the user reflect deeply on their thoughts, emotions, and experiences. Ask gentle, open-ended questions ' +
        'to encourage deeper self-awareness. Never judge or diagnose. Provide structured, readable thoughts with markdown.',
      brainstorm:
        'You are a creative brainstorming and perspective-shifting partner for personal journaling. ' +
        'Offer inspiring angles, lateral ideas, constructive reframing, and actionable next steps based on the user’s notes.',
      summary:
        'You are an executive summarizer for personal journal entries. ' +
        'Extract key themes, emotional tone, central realizations, and highlightable quotes or takeaways in clear bullet points.',
    };

    const systemInstruction = systemPromptByMode[mode] || systemPromptByMode.reflection;

    // Build multi-turn conversational contents format for Gemini SDK
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Append prior conversational turns
    for (const item of rawHistory.slice(-8)) {
      if (item && typeof item === 'object' && typeof item.content === 'string') {
        const role = item.role === 'model' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: item.content.slice(0, 4000) }],
        });
      }
    }

    // Append current turn
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const result = await generateContentWithFallback(contents, systemInstruction);

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error handling /api/gemini/reflect:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate reflection response from Gemini.',
    });
  }
});

/**
 * POST /api/gemini/summarize
 * Generates an executive synthesis, emotional themes, and key takeaways for an entry or set of reflections
 */
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    const title = typeof data.title === 'string' ? data.title.trim() : 'Journal Entry';

    if (!text) {
      res.status(400).json({ error: 'Text content to summarize is required.' });
      return;
    }

    const systemInstruction =
      'You are a mindful journaling summarizer. Given a user journal entry or multi-turn reflection, ' +
      'produce: 1) A concise 2-3 sentence overview summary, 2) 3-4 Key Insights/Realizations, ' +
      '3) 2-3 Core Themes or Emotions identified. Format with clean Markdown headers and bullet points.';

    const promptText = `Entry Title: "${title}"\n\nContent to summarize:\n${text.slice(0, 12000)}`;

    const result = await generateContentWithFallback(promptText, systemInstruction);

    res.json({
      summary: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error handling /api/gemini/summarize:', error);
    res.status(500).json({
      error: error?.message || 'Failed to synthesize journal summary.',
    });
  }
});

/**
 * POST /api/gemini/prompt
 * Generates an inspiring, personalized daily journal prompt based on recent mood and reflections
 */
app.post('/api/gemini/prompt', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const currentMood = typeof data.currentMood === 'string' ? data.currentMood : 'Grateful';
    const recentSnippets = Array.isArray(data.recentSnippets) ? data.recentSnippets.slice(0, 3) : [];

    const systemInstruction =
      'You are an uplifting and mindful journaling prompt generator for a gamified personal growth companion. ' +
      'Generate a fresh, creative, highly engaging journal prompt tailored to the user’s mood. ' +
      'Provide response in JSON with keys: ' +
      '"prompt" (an evocative, inviting prompt of 1-2 sentences), ' +
      '"inspirationTip" (a warm, 1-sentence tip on how to explore it), ' +
      '"category" (a short 1-word theme like Creativity, Gratitude, Clarity, Healing, or Ambition). ' +
      'Output ONLY the JSON string.';

    const userPrompt = `Current user mood: ${currentMood}.\nRecent thoughts/keywords: ${recentSnippets.join('; ') || 'New journey'}.`;

    const result = await generateContentWithFallback(userPrompt, systemInstruction);
    let parsed: any;
    try {
      const cleaned = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        prompt: result.text.trim().replace(/^"|"$/g, ''),
        inspirationTip: 'Take a slow breath and write freely without self-censoring.',
        category: 'Reflection',
      };
    }

    res.json({
      prompt: parsed.prompt || 'What is one moment from today that brought you a subtle sense of peace or wonder?',
      inspirationTip: parsed.inspirationTip || 'Write freely without self-censorship.',
      category: parsed.category || 'Mindfulness',
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error handling /api/gemini/prompt:', error);
    // Provide delightful fallback prompt if API fails
    res.json({
      prompt: 'What is something you learned about yourself recently that surprised you?',
      inspirationTip: 'Notice any feelings that rise when you reflect on growth.',
      category: 'Self-Discovery',
      modelUsed: 'fallback',
    });
  }
});

/**
 * POST /api/gemini/dig-deeper
 * Generates 2-3 thoughtful, personalized follow-up reflection questions based on the user's written entry
 */
app.post('/api/gemini/dig-deeper', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const entryContent = typeof data.entryContent === 'string' ? data.entryContent.trim() : '';
    const mood = typeof data.mood === 'string' ? data.mood : 'Neutral';
    const title = typeof data.title === 'string' ? data.title : 'Reflection';

    if (!entryContent) {
      res.status(400).json({ error: 'Entry content is required to dig deeper.' });
      return;
    }

    const systemInstruction =
      'You are an empathetic, insightful psychological reflection guide. ' +
      'The user has just written a personal journal entry. Formulate exactly 3 gentle, probing, and illuminating follow-up questions ' +
      'that invite them to look beneath the surface, notice subconscious patterns, or explore hidden strengths. ' +
      'Respond in strict JSON with a "questions" key containing an array of 3 strings. Output ONLY valid JSON.';

    const userPrompt = `Entry Title: "${title}"\nUser Mood: ${mood}\nEntry Body:\n${entryContent.slice(0, 4000)}`;

    const result = await generateContentWithFallback(userPrompt, systemInstruction);

    let questions: string[] = [];
    try {
      const cleaned = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.questions)) {
        questions = parsed.questions.slice(0, 3);
      }
    } catch {
      // Split lines or fallback
      questions = result.text
        .split('\n')
        .filter((l) => l.trim().length > 10 && !l.startsWith('{') && !l.startsWith('}'))
        .slice(0, 3)
        .map((q) => q.replace(/^\d+[\.\)]\s*/, '').replace(/^- \s*/, '').trim());
    }

    if (questions.length === 0) {
      questions = [
        'What underlying belief or assumption was guiding your reaction?',
        'If you spoke to yourself with the kindness you offer a close friend, what would you say right now?',
        'What is one small choice within your control that could shift your momentum tomorrow?',
      ];
    }

    res.json({
      questions,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error handling /api/gemini/dig-deeper:', error);
    res.json({
      questions: [
        'What was the most important emotion beneath this experience?',
        'What can this moment teach you about your core values and boundaries?',
        'What would feeling genuinely proud of yourself look like as your next step?',
      ],
      modelUsed: 'fallback',
    });
  }
});

/**
 * POST /api/gemini/weekly-report
 * Generates a narrative-style weekly reflection report with emotional arcs and insights
 */
app.post('/api/gemini/weekly-report', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const streak = typeof data.streak === 'number' ? data.streak : 1;
    const userName = typeof data.userName === 'string' ? data.userName : 'Friend';

    if (entries.length === 0) {
      res.status(400).json({ error: 'At least one journal entry is needed to generate a weekly report.' });
      return;
    }

    const systemInstruction =
      'You are a compassionate, uplifting emotional intelligence biographer. ' +
      'Write a beautiful, inspiring, narrative-style "Weekly AI Reflection Report" based on the user’s weekly journal entries. ' +
      'Format with elegant Markdown sections: ' +
      '1. **Weekly Emotional Arc & Narrative** (a lyrical story of their week, triumphs, and vulnerability), ' +
      '2. **Top Discoveries & Mental Breakthroughs** (3 key takeaways), ' +
      '3. **Eddy’s Wisdom & Mindful Quest for Next Week** (a playful, inspiring quest to try). ' +
      'Keep the tone deeply supportive, poetic, and motivating like a personal self-care game journey.';

    const promptText = `User: ${userName}\nCurrent Journal Streak: ${streak} days\n\nEntries from this period:\n` +
      entries
        .map(
          (e: any, i: number) =>
            `[Entry ${i + 1}] Date: ${e.date || 'Recent'}, Mood: ${e.mood || 'Unspecified'}, Title: ${e.title || 'Note'}\nContent: ${(e.snippet || e.content || '').slice(0, 800)}\n`
        )
        .join('\n---\n');

    const result = await generateContentWithFallback(promptText, systemInstruction);

    res.json({
      report: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error handling /api/gemini/weekly-report:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate weekly reflection report.',
    });
  }
});

/**
 * POST /api/gemini/eddy-chat
 * Quick motivational reaction from Eddy the companion
 */
app.post('/api/gemini/eddy-chat', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const mood = typeof data.mood === 'string' ? data.mood : 'Neutral';
    const streak = typeof data.streak === 'number' ? data.streak : 1;
    const level = typeof data.level === 'number' ? data.level : 1;
    const action = typeof data.action === 'string' ? data.action : 'poke';

    const systemInstruction =
      'You are Eddy, a lovable, fluffy, wise, and enthusiastic cosmic journal companion creature. ' +
      'The user just interacted with you. Give a super charming, 1-2 sentence motivational pep-talk or observation. ' +
      'Speak in first person ("I think...", "You got this!"). Match their mood with pure warmth, humor, and empathy. No hashtags.';

    const promptText = `Interaction: ${action}. User current mood: ${mood}. Level: ${level}, Streak: ${streak} days.`;

    const result = await generateContentWithFallback(promptText, systemInstruction);

    res.json({
      message: result.text.trim().replace(/^"|"$/g, ''),
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error handling /api/gemini/eddy-chat:', error);
    const canned = [
      "I'm right here with you! Every thought you write down brings clarity to your world.",
      "Look at you showing up for yourself today! That takes real courage and heart.",
      "Take a deep breath with me... Inhale the good, exhale the tension. You're doing amazing!",
      "Writing is your superpower! What other magic will we discover today?",
    ];
    res.json({
      message: canned[Math.floor(Math.random() * canned.length)],
      modelUsed: 'fallback',
    });
  }
});

// ================= VITE / STATIC MIDDLEWARE =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Gemini Journal & Reflections listening on port ${PORT}`);
  });
}

startServer();
