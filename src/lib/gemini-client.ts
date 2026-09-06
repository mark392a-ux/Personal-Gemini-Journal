import { ChatMessage, ReflectionMode } from '../types';

export interface ReflectResponse {
  reply: string;
  modelUsed: string;
  timestamp: string;
}

export interface SummarizeResponse {
  summary: string;
  modelUsed: string;
  timestamp: string;
}

/**
 * Sends a reflection prompt and conversation context to the server-side Gemini proxy
 */
export async function sendReflectionPrompt(
  prompt: string,
  history: ChatMessage[],
  mode: ReflectionMode = 'reflection'
): Promise<ReflectResponse> {
  const payload = {
    prompt: prompt.trim(),
    mode,
    history: history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  };

  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to connect to Gemini API';
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMsg = errData.error;
      }
    } catch {
      errorMsg = `Server error HTTP ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Calls the server-side endpoint to generate an executive synthesis and key takeaways
 */
export async function generateEntrySummary(
  text: string,
  title?: string
): Promise<SummarizeResponse> {
  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, title }),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to summarize entry with Gemini';
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMsg = errData.error;
      }
    } catch {
      errorMsg = `Server error HTTP ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export interface DailyPromptResponse {
  prompt: string;
  inspirationTip: string;
  category: string;
  modelUsed?: string;
}

export async function fetchDailyPrompt(
  currentMood?: string,
  recentSnippets?: string[]
): Promise<DailyPromptResponse> {
  const response = await fetch('/api/gemini/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentMood, recentSnippets }),
  });

  if (!response.ok) {
    throw new Error('Could not fetch daily prompt');
  }

  return response.json();
}

export interface DigDeeperResponse {
  questions: string[];
  modelUsed?: string;
}

export async function fetchDigDeeperQuestions(
  entryContent: string,
  mood?: string,
  title?: string
): Promise<DigDeeperResponse> {
  const response = await fetch('/api/gemini/dig-deeper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryContent, mood, title }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate follow-up reflection questions');
  }

  return response.json();
}

export interface WeeklyReportResponse {
  report: string;
  modelUsed?: string;
  timestamp: string;
}

export async function fetchWeeklyReport(
  entries: Array<{ date: string; mood: string; title: string; snippet: string }>,
  streak: number,
  userName?: string
): Promise<WeeklyReportResponse> {
  const response = await fetch('/api/gemini/weekly-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries, streak, userName }),
  });

  if (!response.ok) {
    let msg = 'Failed to generate weekly report';
    try {
      const err = await response.json();
      if (err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  return response.json();
}

export interface EddyChatResponse {
  message: string;
  modelUsed?: string;
}

export async function fetchEddyReaction(
  mood: string,
  level: number,
  streak: number,
  action: string
): Promise<EddyChatResponse> {
  const response = await fetch('/api/gemini/eddy-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood, level, streak, action }),
  });

  if (!response.ok) {
    return {
      message: "You're writing your own story, one word at a time. I'm cheering for you!",
    };
  }

  return response.json();
}
