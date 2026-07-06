export type StepType = 'navigate' | 'click' | 'input' | 'wait' | 'scroll' | 'extract' | 'condition' | 'api_request' | 'email_send' | 'webhook' | 'script_run';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BotStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  selector?: string;
  value?: string;
  codeSnippet: string;
  simulatedDurationMs: number;
  status?: StepStatus;
  maxRetries?: number;
  continueOnFailure?: boolean;
  // Conditional Logic
  condition?: string;
  ifSteps?: BotStep[];
  elseSteps?: BotStep[];
}

export interface BotConfig {
  name: string;
  goal: string;
  url: string;
  speed: number; // multiplier: 1, 2, 5
  // Advanced Runtime Capabilities:
  useProxies?: boolean;
  rotateIpOnBan?: boolean;
  bypassCaptcha?: boolean;
  isolatedContext?: boolean; // Security sandboxing
  maxConcurrentThreads?: number;
  
  // Tactical & Advanced Bot Behaviors:
  ghostMode?: boolean; // Human-like chaotic behavior to bypass bot detection (random cursors, organic delays).
  cognitiveVision?: boolean; // Artificial Intelligence selector healing / Semantic element detection.
  quantumSpeed?: boolean; // Extremely parallel execution bypassing normal browser queues.
  chaosEngine?: boolean; // Simulating human typos, random scrolling, and emotional reading pauses.

  // Infrastructure & Defense (Managing real-world constraints):
  cloudSwarm?: boolean; // Execute on distributed P2P edge nodes
  residentialProxies?: boolean; // Premium Residential IPs grouped by Geo-Cluster
  antiBotShield?: boolean; // Community-driven Bypass Patches via JSON
  geoClustering?: boolean; // Lock sessions within a specific geographic IP pool
  scoutHarvesterModule?: boolean; // Slow chaotic scout followed by fast headless harvesters
  hotSwappingBackup?: boolean; // Active-Passive standby bots for instant failover without dropping session
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'debug' | 'data' | 'success' | 'warn' | 'error';
  message: string;
  stepId?: string;
}

export interface ScrapedRecord {
  [key: string]: any;
}

export interface ReconTarget {
  id: string;
  type: 'ip' | 'query' | 'url';
  value: string;
  createdAt: number;
}
