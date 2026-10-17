import type { StoragePort } from "@grillme/platform";

const databaseName = "grillme-web-v1";
const storeName = "values";
let writeQueue = Promise.resolve();
const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(databaseName, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(storeName);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error("Browser storage is unavailable."));
});
const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error("Browser storage operation failed."));
});
const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = transaction.onerror = () => reject(new Error("Browser storage transaction failed."));
});
const mutate = (operation: () => Promise<void>): Promise<void> => {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => undefined);
  return result;
};
export const browserStorage: StoragePort = {
  async get(key) {
    await writeQueue;
    const database = await openDatabase();
    try { return await requestResult(database.transaction(storeName).objectStore(storeName).get(key)) ?? null; }
    finally { database.close(); }
  },
  set: (key, value) => mutate(async () => {
    const database = await openDatabase();
    try { const transaction = database.transaction(storeName, "readwrite"); transaction.objectStore(storeName).put(value, key); await transactionDone(transaction); }
    finally { database.close(); }
  }),
  append: (key, value) => mutate(async () => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(new Error("Browser storage operation failed."));
        request.onsuccess = () => {
          const values = Array.isArray(request.result) ? request.result : [];
          const candidate = value && typeof value === "object" && "idempotencyKey" in value ? String(value.idempotencyKey) : null;
          if (!candidate || !values.some((entry: unknown) => entry && typeof entry === "object" && "idempotencyKey" in entry && String(entry.idempotencyKey) === candidate)) store.put([...values, value], key);
          resolve();
        };
      });
      await transactionDone(transaction);
    } finally { database.close(); }
  }),
  remove: (key) => mutate(async () => {
    const database = await openDatabase();
    try { const transaction = database.transaction(storeName, "readwrite"); transaction.objectStore(storeName).delete(key); await transactionDone(transaction); }
    finally { database.close(); }
  }),
};
