# Gemini Journal & Reflections: User-Authenticated AI Companion

A production-grade, full-stack journaling and reflection application built with **React 19**, **Express**, **Firebase Authentication (Google Sign-In)**, **Cloud Firestore**, and **Gemini 3.6 Flash**.

All user interactions, multi-turn reflections, and synthesized summaries are strictly isolated per authenticated user in Cloud Firestore. API keys and credentials never touch client bundles, adhering to strict zero-trust principles.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Browser / Client (React 19)              │
│  - Firebase Auth (Google Sign-In Federated Identity)   │
│  - Client Firestore SDK (Owner-Bound /users/{uid}/*)   │
└───────────────────────────┬────────────────────────────┘
                            │ API Calls (/api/gemini/*)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Backend Proxy Server (Express + Node)       │
│  - Top-Level Request Deserialization (1MB limit)       │
│  - Defensive Payload Ingestion & Null-Safe Parsing     │
│  - Resilient Model Fallback Ladder                     │
│  - Google Cloud Secret Manager / GEMINI_API_KEY        │
└───────────────────────────┬────────────────────────────┘
                            │ @google/genai SDK
                            ▼
┌────────────────────────────────────────────────────────┐
│                Google Gemini 3.6 Flash                 │
│  - Primary: gemini-3.6-flash                           │
│  - Fallbacks: gemini-3.1-flash-lite,                   │
│               gemini-flash-latest, gemini-3.7-flash    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Agentic Threat Modeling & Security Directives

| Threat Zone | Risk Identified | Countermeasure Implemented |
| :--- | :--- | :--- |
| **Input Surfaces** | Malformed payloads, script injection in journal text, oversized inputs | Strict 8,000 character limits, null-safe payload destructuring, and sanitized markdown output. |
| **Planning & Reasoning** | Indirect prompt injection trying to hijack system instructions | Delimited system instructions with untrusted user input wrapped as plain data. |
| **Tool Execution** | Unauthenticated API abuse and SSRF | All Gemini API calls routed strictly via server-side Express proxy. |
| **Memory & State** | Cross-user data leakage and session hijacking | Firestore security rules enforce `request.auth.uid == userId`. Undefined values stripped prior to persistence. |
| **Inter-System Comm.** | Client-side API key leakage | `GEMINI_API_KEY` is loaded strictly server-side from environment / Secret Manager. |

---

## 3. Database Security Configuration

Firestore security rules enforce complete tenant data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

To deploy rules directly with the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Secret Management Setup

Follow standard Google Cloud Secret Manager setup:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Deployment to Google Cloud Run

### Build & Deploy
Deploy the unified container to Cloud Run using `gcloud run deploy`:

```bash
gcloud run deploy gemini-journal-reflections \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### Required Campaign Labeling
To register the service for challenge verification:

```bash
gcloud run services update gemini-journal-reflections \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Walkthrough & Test Guide

Every user interaction has a concrete test case:

### Test Case 1: Unauthenticated Landing & Google Sign-In
1. Navigate to the root URL (`/`).
2. Verify the Landing View displays value propositions and privacy pillars.
3. Click **"Review Agentic Threat Model & Compliance Specs"**; verify the security modal opens.
4. Click **"Continue with Google Sign-In"**; complete Google OAuth.
5. Verify redirection to the authenticated dashboard displaying the user profile photo and display name.

### Test Case 2: Multi-Turn Journal Reflection
1. Click **"New Journal Entry"**.
2. Select companion mode: **"Deep Reflection"**.
3. Type `"I had a challenging meeting at work today and felt overwhelmed."` and press **Send**.
4. Verify the user message renders with a timestamp.
5. Verify Gemini responds with an empathetic, thoughtful perspective and displays the active model badge (`gemini-3.6-flash`).
6. Type a follow-up: `"How can I reframe my reaction before tomorrow?"` and send.
7. Verify multi-turn conversational context is preserved.

### Test Case 3: Creative Brainstorming & Mode Switching
1. Toggle companion mode to **"Creative Brainstorm"**.
2. Type `"Help me brainstorm 3 constructive ways to prepare for my next discussion."`
3. Verify Gemini shifts tone to creative ideation and actionable steps.

### Test Case 4: Executive Summarization
1. Click **"Summarize with Gemini"** at the top right.
2. Verify the AI summarizes the session into a concise overview, key insights, and identified themes.
3. Verify the summary is rendered in the executive card and stored in the interaction state.

### Test Case 5: Persistent Firestore Isolation & History
1. Observe the persistence status indicator change from `"Saving..."` to `"Saved"`.
2. Reload the browser or open the application in another tab with the same account.
3. Verify the entry appears in the Left History Sidebar with the correct title and message count.
4. Use the search bar in the sidebar to search for keywords in the entry; verify real-time filtering.
5. Click the trash icon to delete an entry; verify confirmation prompt and successful removal.

### Test Case 6: Sign Out & Tenant Isolation
1. Click **"Sign Out"** in the navigation bar.
2. Verify the application returns to the unauthenticated Landing View.
3. Verify all session data is cleared from client state.

### Test Case 7: Mood Check-In & Validation
1. Create a new journal entry.
2. Attempt to write or submit without selecting a mood; observe the prompt to check in first.
3. Select a mood (e.g., Grateful 💖, Excited 🤩, Happy 😊).
4. Verify the active mood card highlights with custom pastel colors, and companion Eddy reacts.
5. Click **"Mood Stats"** on the Gamification Bar to view the emotional distribution chart and dominant mood.

### Test Case 8: Daily AI Prompt Generator
1. In the journal workspace, observe the **"Get Today's Prompt"** banner.
2. Click **"Get Today's Prompt"**; verify Gemini analyzes recent thoughts and current mood to produce a tailored writing spark.
3. Click **"Use This Prompt"** to inject it directly into the journal editor.
4. Click **"Regenerate"** to request another personalized writing prompt.

### Test Case 9: Dig Deeper & XP Accumulation
1. After composing thoughts, click the glowing **"Dig Deeper"** button.
2. Verify Gemini asks 2–3 probing reflection questions.
3. Answer the questions and click **"Save Reflections (+5 XP)"**.
4. Observe the XP counter rise and Eddy offer an encouraging reaction.

### Test Case 10: Weekly AI Narrative Reflection Report
1. Click **"Weekly Report"** on the top Gamification Bar.
2. Click **"Generate Weekly Reflection (+20 XP)"**.
3. Verify Gemini reads your recent entries and emotional check-ins, synthesizing a thoughtful narrative on your growth, recurring themes, and actionable wisdom.
4. Verify the report is permanently saved in `/users/{userId}/weekly_reports` and selectable in the past reports history.

### Test Case 11: Playable Character Eddy & Badge Trophy Case
1. Observe companion Eddy positioned above the bottom input composer (`bottom-36 sm:bottom-40`), providing clear, unobstructed access to the **"Send Reflection"** button and textarea.
2. Click the minimize toggle (`-`) next to Eddy to collapse Eddy into a compact status pill (`Eddy (LV1)`).
3. Click the collapsed pill to restore Eddy to his animated form.
4. Click Eddy or the **"High Five!"** button to receive words of encouragement and mindful thoughts.
5. Click **"Badges"** on the Gamification Bar to inspect the Trophy Case.
6. Verify locked and unlocked achievements (First Step, Deep Diver, Streak Pioneer, Week of Clarity, Mindful Chronicler, Thought Weaver, Emotional Spectrum) display live progress.

