declare module 'electron-store' {
  import { EventEmitter } from 'events';

  interface StoreOptions<T> {
    name?: string;
    cwd?: string;
    encryptionKey?: string | Buffer;
    fileExtension?: string;
    clearInvalidConfig?: boolean;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    defaults?: Partial<T>;
    watch?: boolean;
    schema?: any;
  }

  class Store<T extends Record<string, any> = Record<string, unknown>> {
    constructor(options?: StoreOptions<T>);
    
    // Path to the storage file
    readonly path: string;
    
    // Get an item
    get<K extends keyof T>(key: K): T[K];
    get<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
    get<K extends string, V = unknown>(key: K, defaultValue?: V): V;
    
    // Set an item
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(key: string, value: unknown): void;
    set(object: Partial<T>): void;
    
    // Check if an item exists
    has(key: keyof T | string): boolean;
    
    // Delete an item
    delete(key: keyof T | string): void;
    
    // Delete all items
    clear(): void;
    
    // Get all items as an object
    get store(): T;
    set store(value: T);
    
    // Get the number of items
    get size(): number;
    
    // Open the storage file in the user's editor
    openInEditor(): Promise<void>;
    
    // Watch for changes
    onDidChange<K extends keyof T>(key: K, callback: (newValue: T[K], oldValue: T[K]) => void): () => void;
    onDidAnyChange(callback: (newValue: T, oldValue: T) => void): () => void;
  }

  export default Store;
}