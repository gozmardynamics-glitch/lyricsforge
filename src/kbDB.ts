// --- INDEXEDDB PERSISTENT KNOWLEDGE BASE SERVICE ---
class KnowledgeBaseDB {
  private dbName = "AILyricViralityKnowledgeBase";
  private dbVersion = 2;

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject("IndexedDB not supported");
        return;
      }
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("songFingerprints")) {
          db.createObjectStore("songFingerprints", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("artistProfiles")) {
          db.createObjectStore("artistProfiles", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("viralTemplates")) {
          db.createObjectStore("viralTemplates", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("activityLogs")) {
          db.createObjectStore("activityLogs", { keyPath: "id" });
        }
      };
    });
  }

  async saveFingerprint(id: string, data: any): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction("songFingerprints", "readwrite");
      tx.objectStore("songFingerprints").put({ id, ...data, updatedAt: Date.now() });
    } catch (e) {
      console.warn("IndexedDB saveFingerprint error:", e);
    }
  }

  async getFingerprints(): Promise<any[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction("songFingerprints", "readonly");
        const req = tx.objectStore("songFingerprints").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
  }

  async saveActivityLog(id: string, logData: any): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction("activityLogs", "readwrite");
      tx.objectStore("activityLogs").put({ id, ...logData, timestamp: Date.now() });
    } catch (e) {
      console.warn("IndexedDB saveActivityLog error:", e);
    }
  }

  async getActivityLogs(): Promise<any[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction("activityLogs", "readonly");
        const req = tx.objectStore("activityLogs").getAll();
        req.onsuccess = () => resolve((req.result || []).sort((a: any, b: any) => b.timestamp - a.timestamp));
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
  }
}

export const kbDB = new KnowledgeBaseDB();
