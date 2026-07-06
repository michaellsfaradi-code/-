// workspace.ts - Proxying requests to the secure backend.
// Note: We expect the Firebase ID Token (accessToken) to be passed, which is sent as Bearer. 
// The Google Workspace access token is securely managed in an HttpOnly cookie.

export async function uploadToDrive(accessToken: string, fileName: string, fileContent: string) {
  const res = await fetch("/api/workspace/drive/upload", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fileName, fileContent })
  });
  if (!res.ok) throw new Error(`Google Drive upload failed: ${(await res.json()).error}`);
  return await res.json();
}

export async function createGoogleSheet(accessToken: string, title: string, data: any[]) {
  const res = await fetch("/api/workspace/sheets/create", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, data })
  });
  if (!res.ok) throw new Error(`Google Sheets creation failed: ${(await res.json()).error}`);
  return await res.json();
}

export async function createCalendarEvent(
  accessToken: string,
  name: string,
  goal: string,
  url: string,
  stepCount: number,
  status: string
) {
  const res = await fetch("/api/workspace/calendar/event", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, goal, url, stepCount, status })
  });
  if (!res.ok) throw new Error(`Google Calendar event creation failed: ${(await res.json()).error}`);
  return await res.json();
}

export async function sendEmailNotification(
  accessToken: string,
  recipient: string,
  name: string,
  goal: string,
  stepCount: number,
  scrapedCount: number,
  scriptText: string
) {
  const res = await fetch("/api/workspace/gmail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ recipient, name, goal, stepCount, scrapedCount, scriptText })
  });
  if (!res.ok) throw new Error(`Gmail delivery failed: ${(await res.json()).error}`);
  return await res.json();
}

export async function createGoogleDocBlueprint(
  accessToken: string,
  name: string,
  goal: string,
  url: string,
  steps: any[]
) {
  const res = await fetch("/api/workspace/docs/blueprint", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, goal, url, steps })
  });
  if (!res.ok) throw new Error(`Google Docs creation failed: ${(await res.json()).error}`);
  return await res.json();
}

export async function createGoogleSlidesSummary(
  accessToken: string,
  name: string,
  goal: string,
  steps: any[]
) {
  const res = await fetch("/api/workspace/slides/summary", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name }) // simplify
  });
  if (!res.ok) throw new Error(`Google Slides creation failed: ${(await res.json()).error}`);
  return await res.json();
}

export async function listGoogleChatSpaces(accessToken: string) {
  try {
    const res = await fetch("/api/workspace/chat/spaces", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!res.ok) {
       return [{ name: "spaces/mock-sandbox", displayName: "BotForge Sandbox Space (Mock)" }];
    }
    return await res.json();
  } catch (err) {
    return [{ name: "spaces/mock-sandbox", displayName: "BotForge Sandbox Space (Mock Network Error)" }];
  }
}

export async function sendGoogleChatMessage(accessToken: string, spaceId: string, messageText: string) {
  const res = await fetch("/api/workspace/chat/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ spaceId, messageText })
  });
  if (!res.ok) throw new Error(`Google Chat message delivery failed: ${(await res.json()).error}`);
  return await res.json();
}

