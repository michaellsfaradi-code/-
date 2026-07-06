import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  serverTimestamp,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BotStep } from "../types";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface FirestoreBot {
  id?: string;
  name: string;
  goal: string;
  url: string;
  speed: number;
  steps: BotStep[];
  userId: string;
  isShared?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreChatMessage {
  id?: string;
  text: string;
  sender: "user" | "model";
  userId: string;
  timestamp?: any;
  botPreset?: {
    name: string;
    description?: string;
    goal: string;
    url: string;
    speed: number;
    steps: BotStep[];
  };
}

export async function saveBotToFirestore(
  userId: string, 
  name: string, 
  goal: string, 
  url: string, 
  speed: number, 
  steps: BotStep[], 
  botId?: string,
  isShared?: boolean
): Promise<string> {
  const targetBotId = botId || "bot_" + Date.now().toString();
  const pathForWrite = `bots/${targetBotId}`;
  
  // Backup in LocalStorage
  try {
    const rawLocal = localStorage.getItem(`botforge_local_bots_${userId}`) || "[]";
    const localBots = JSON.parse(rawLocal);
    const updatedObj = {
      id: targetBotId,
      name,
      goal,
      url,
      speed,
      steps,
      userId,
      isShared,
      updatedAt: { seconds: Math.floor(Date.now() / 1000) }
    };
    const idx = localBots.findIndex((b: any) => b.id === targetBotId);
    if (idx >= 0) {
      localBots[idx] = updatedObj;
    } else {
      localBots.unshift(updatedObj);
    }
    localStorage.setItem(`botforge_local_bots_${userId}`, JSON.stringify(localBots));
  } catch (e) {
    console.error("Local storage bot saving failed", e);
  }

  try {
    const data: any = {
      name,
      goal,
      url,
      speed,
      steps: steps.map(({ id, type, title, description, selector, value, codeSnippet, simulatedDurationMs }) => ({
        id, 
        type, 
        title, 
        description, 
        selector: selector || "", 
        value: value || "", 
        codeSnippet, 
        simulatedDurationMs
      })),
      userId,
      isShared: isShared !== undefined ? isShared : false,
      updatedAt: serverTimestamp()
    };
    if (!botId) {
      data.createdAt = serverTimestamp();
    }
    await setDoc(doc(db, "bots", targetBotId), data, { merge: true });
    return targetBotId;
  } catch (error) {
    console.warn("Firestore saveBotToFirestore failed, fallback was saved successfully locally:", error);
    return targetBotId;
  }
}

export async function loadUserSavedBots(userId: string): Promise<FirestoreBot[]> {
  const pathForGetDocs = 'bots';
  try {
    const q = query(
      collection(db, "bots"), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const bots: FirestoreBot[] = [];
    querySnapshot.forEach((doc) => {
      bots.push({ id: doc.id, ...doc.data() } as FirestoreBot);
    });
    return bots.sort((a, b) => {
      const secA = a.updatedAt?.seconds || 0;
      const secB = b.updatedAt?.seconds || 0;
      return secB - secA;
    });
  } catch (error) {
    console.warn("Firestore loadUserSavedBots failed, using local offline fallback database:", error);
    const rawLocal = localStorage.getItem(`botforge_local_bots_${userId}`) || "[]";
    try {
      return JSON.parse(rawLocal);
    } catch (e) {
      return [];
    }
  }
}

export async function loadSharedBot(botId: string): Promise<FirestoreBot | null> {
  const pathForGet = `bots/${botId}`;
  try {
    const docSnap = await getDoc(doc(db, "bots", botId));
    if (docSnap.exists() && docSnap.data().isShared) {
      return { id: docSnap.id, ...docSnap.data() } as FirestoreBot;
    }
    return null;
  } catch (error) {
    console.warn("Firestore loadSharedBot failed:", error);
    return null;
  }
}

export async function deleteBotFromFirestore(botId: string): Promise<void> {
  const pathForDelete = `bots/${botId}`;
  // Delete from local cache
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (key.startsWith("botforge_local_bots_")) {
        const list = JSON.parse(localStorage.getItem(key) || "[]");
        const filtered = list.filter((b: any) => b.id !== botId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.error(e);
  }

  try {
    await deleteDoc(doc(db, "bots", botId));
  } catch (error) {
    console.warn("Firestore deleteBotFromFirestore status failed:", error);
  }
}

export async function saveChatMessageToFirestore(
  userId: string, 
  text: string, 
  sender: "user" | "model"
): Promise<void> {
  const pathForWrite = `users/${userId}/chat`;
  try {
    await addDoc(collection(db, "users", userId, "chat"), {
      text,
      sender,
      userId,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn("Firestore saveChatMessageToFirestore failed, silent catch:", error);
  }
}

export async function loadUserChatMessages(userId: string): Promise<FirestoreChatMessage[]> {
  const pathForGetDocs = `users/${userId}/chat`;
  try {
    const q = query(
      collection(db, "users", userId, "chat"), 
      orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);
    const chats: FirestoreChatMessage[] = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as FirestoreChatMessage);
    });
    return chats;
  } catch (error) {
    return [];
  }
}

export interface FirestoreExecutionLog {
  id?: string;
  botId: string;
  userId: string;
  status: "success" | "failure";
  timestamp?: any;
  durationMs: number;
  stepsRan: number;
  totalSteps: number;
}

export async function saveExecutionLogToFirestore(
  userId: string,
  botId: string,
  status: "success" | "failure",
  durationMs: number,
  stepsRan: number,
  totalSteps: number
): Promise<string> {
  const targetLogId = "log_" + Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const pathForWrite = `execution_logs`;

  // Backup in LocalStorage
  try {
    const rawLocal = localStorage.getItem(`botforge_local_logs_${userId}`) || "[]";
    const localLogs = JSON.parse(rawLocal);
    const newLogObj = {
      id: targetLogId,
      userId,
      botId,
      status,
      durationMs,
      stepsRan,
      totalSteps,
      timestamp: { seconds: Math.floor(Date.now() / 1000) }
    };
    localLogs.unshift(newLogObj);
    localStorage.setItem(`botforge_local_logs_${userId}`, JSON.stringify(localLogs));
  } catch (e) {
    console.error("Local log saving failed", e);
  }

  try {
    const docRef = await addDoc(collection(db, "execution_logs"), {
      userId,
      botId,
      status,
      durationMs,
      stepsRan,
      totalSteps,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.warn("Firestore saveExecutionLogToFirestore failed, fallback saved locally:", error);
    return targetLogId;
  }
}

export async function loadUserExecutionLogs(userId: string): Promise<FirestoreExecutionLog[]> {
  const pathForGetDocs = 'execution_logs';
  try {
    const q = query(
      collection(db, "execution_logs"), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const logs: FirestoreExecutionLog[] = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as FirestoreExecutionLog);
    });
    return logs.sort((a, b) => {
      const secA = a.timestamp?.seconds || 0;
      const secB = b.timestamp?.seconds || 0;
      return secB - secA;
    });
  } catch (error) {
    console.warn("Firestore loadUserExecutionLogs failed, returning local cached database logs:", error);
    const rawLocal = localStorage.getItem(`botforge_local_logs_${userId}`) || "[]";
    try {
      return JSON.parse(rawLocal);
    } catch (e) {
      return [];
    }
  }
}

export async function saveGlobalConfigToFirestore(config: any): Promise<void> {
  const pathForWrite = "system_config/global";
  try {
    await setDoc(doc(db, "system_config", "global"), {
      ...config,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn("Firestore saveGlobalConfigToFirestore failed:", error);
  }
}

export async function loadGlobalConfigFromFirestore(): Promise<any | null> {
  const pathForGet = "system_config/global";
  try {
    const docSnap = await getDoc(doc(db, "system_config", "global"));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.warn("Firestore loadGlobalConfigFromFirestore failed, utilizing static integration structures:", error);
    return {
      customIntegrations: [
        { id: "make_integration", name: "Make.com (Maka)", apiKey: "1d28d89d-0a60-4944-817a-c8767cf3832d" }
      ]
    };
  }
}

export async function saveSyncTableToFirestore(tableKey: string, list: any[]): Promise<void> {
  const pathForWrite = `global_sync_tables/${tableKey}`;
  try {
    await setDoc(doc(db, "global_sync_tables", tableKey), {
      list,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn("Firestore saveSyncTableToFirestore failed:", error);
  }
}

export function subscribeToSyncTable(tableKey: string, callback: (list: any[]) => void): () => void {
  const docRef = doc(db, "global_sync_tables", tableKey);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && Array.isArray(data.list)) {
        callback(data.list);
      }
    }
  }, (error) => {
    console.warn(`Error in real-time subscription for ${tableKey}:`, error);
  });
}
