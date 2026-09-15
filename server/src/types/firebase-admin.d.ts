declare module 'firebase-admin/app' {
  export interface App {
    name: string;
    options: Record<string, any>;
  }

  export interface AppOptions {
    credential?: any;
    databaseURL?: string;
    storageBucket?: string;
    projectId?: string;
    [key: string]: any;
  }

  export function initializeApp(options?: AppOptions, name?: string): App;
  export function getApps(): App[];
  export function cert(serviceAccountPathOrObject: string | Record<string, any>): any;
}

declare module 'firebase-admin/firestore' {
  export type WhereFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'not-in' | 'array-contains-any';
  export type OrderByDirection = 'desc' | 'asc';

  export interface DocumentData {
    [key: string]: any;
  }

  export interface UpdateData {
    [key: string]: any;
  }

  export interface SetOptions {
    merge?: boolean;
    mergeFields?: string[];
  }

  export interface WriteResult {
    writeTime: any;
  }

  export interface DocumentSnapshot<T = DocumentData> {
    readonly id: string;
    readonly exists: boolean;
    data(): T | undefined;
    get(fieldPath: string): any;
  }

  export interface QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
    data(): T;
  }

  export interface QuerySnapshot<T = DocumentData> {
    readonly docs: QueryDocumentSnapshot<T>[];
    readonly empty: boolean;
    readonly size: number;
    forEach(callback: (result: QueryDocumentSnapshot<T>) => void, thisArg?: any): void;
  }

  export interface AggregateQuerySnapshot {
    data(): { count: number };
  }

  export interface AggregateQuery {
    get(): Promise<AggregateQuerySnapshot>;
  }

  export interface Query<T = DocumentData> {
    where(fieldPath: string, opStr: WhereFilterOp, value: any): Query<T>;
    orderBy(fieldPath: string, directionStr?: OrderByDirection): Query<T>;
    limit(limit: number): Query<T>;
    offset(offset: number): Query<T>;
    get(): Promise<QuerySnapshot<T>>;
    count(): AggregateQuery;
  }

  export interface DocumentReference<T = DocumentData> {
    readonly id: string;
    readonly path: string;
    get(): Promise<DocumentSnapshot<T>>;
    set(data: Partial<T>, options?: SetOptions): Promise<WriteResult>;
    update(data: UpdateData): Promise<WriteResult>;
    delete(): Promise<WriteResult>;
  }

  export interface CollectionReference<T = DocumentData> extends Query<T> {
    readonly id: string;
    readonly path: string;
    doc(documentPath?: string): DocumentReference<T>;
    add(data: T): Promise<DocumentReference<T>>;
  }

  export interface WriteBatch {
    set<T>(documentRef: DocumentReference<T>, data: Partial<T>, options?: SetOptions): WriteBatch;
    update(documentRef: DocumentReference<any>, data: UpdateData): WriteBatch;
    delete(documentRef: DocumentReference<any>): WriteBatch;
    commit(): Promise<WriteResult[]>;
  }

  export interface Firestore {
    collection(collectionPath: string): CollectionReference;
    doc(documentPath: string): DocumentReference;
    batch(): WriteBatch;
  }

  export class FieldValue {
    static serverTimestamp(): any;
    static delete(): any;
    static increment(n: number): any;
    static arrayUnion(...elements: any[]): any;
    static arrayRemove(...elements: any[]): any;
  }

  export class Timestamp {
    readonly seconds: number;
    readonly nanoseconds: number;
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    static fromMillis(milliseconds: number): Timestamp;
    toDate(): Date;
    toMillis(): number;
  }

  export function getFirestore(app?: any): Firestore;
}

declare module 'firebase-admin' {
  import * as app from 'firebase-admin/app';
  import * as firestore from 'firebase-admin/firestore';

  const admin: {
    initializeApp: typeof app.initializeApp;
    credential: {
      cert: typeof app.cert;
    };
    firestore: typeof firestore.getFirestore;
  };

  export default admin;
}
