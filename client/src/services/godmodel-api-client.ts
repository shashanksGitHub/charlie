export interface GodmodelProgress {
  startedAt: string;
  updatedAt: string;
  currentIndex: number; // 0-based
  responses: Array<{ index: number; statement: string; answer: string }>;
}

class GodmodelAPIClient {
  async getStatements(): Promise<{ count: number; statements: string[] }> {
    const res = await fetch('/api/godmodel/statements');
    if (!res.ok) throw new Error('Failed to load statements');
    return res.json();
  }

  async getProgress(): Promise<GodmodelProgress | null> {
    const res = await fetch('/api/godmodel/progress');
    if (res.status === 401) throw new Error('Not authenticated');
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.records as GodmodelProgress) || null;
  }

  async saveProgress(progress: GodmodelProgress): Promise<void> {
    const res = await fetch('/api/godmodel/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });
    if (!res.ok) throw new Error('Failed to save progress');
  }

  async complete(final: GodmodelProgress): Promise<void> {
    const res = await fetch('/api/godmodel/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final }),
    });
    if (!res.ok) throw new Error('Failed to complete test');
  }
}

export const godmodelAPI = new GodmodelAPIClient();


