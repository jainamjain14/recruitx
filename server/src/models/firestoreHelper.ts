import { db, Collections } from '../config/firebase.js';

export const dateFromFirestore = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val?.toDate === 'function') return val.toDate();
  if (typeof val?.toMillis === 'function') return new Date(val.toMillis());
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return new Date();
};

export const cleanDataForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanDataForFirestore);
  }
  if (typeof obj === 'object') {
    const copy: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        copy[key] = cleanDataForFirestore(val);
      }
    }
    return copy;
  }
  return obj;
};

export interface PopulateOption {
  path: string;
  select?: string;
}

/**
 * Resolves populate references using Firestore collections
 */
export const resolvePopulate = async (docData: any, populates: PopulateOption[]): Promise<any> => {
  if (!docData) return docData;

  for (const pop of populates) {
    const fieldVal = docData[pop.path];
    if (!fieldVal) continue;

    const refId = typeof fieldVal === 'string' ? fieldVal : fieldVal._id || fieldVal.id;
    if (!refId) continue;

    // Determine target collection based on path name
    let targetCollection = '';
    if (pop.path === 'recruiter' || pop.path === 'student' || pop.path === 'postedBy' || pop.path === 'sender' || pop.path === 'recipient') {
      targetCollection = Collections.USERS;
    } else if (pop.path === 'job') {
      targetCollection = Collections.JOBS;
    } else if (pop.path === 'application') {
      targetCollection = Collections.APPLICATIONS;
    }

    if (targetCollection) {
      try {
        const targetSnap = await db.collection(targetCollection).doc(refId).get();
        if (targetSnap.exists) {
          const targetRaw = targetSnap.data() || {};
          let targetObj: any = { _id: targetSnap.id, ...targetRaw };

          if (pop.select) {
            const fields = pop.select.split(' ').filter(Boolean);
            const filtered: any = { _id: targetSnap.id };
            for (const f of fields) {
              if (targetObj[f] !== undefined) {
                filtered[f] = targetObj[f];
              }
            }
            targetObj = filtered;
          }
          docData[pop.path] = targetObj;
        }
      } catch (err) {
        // Fallback: leave reference as is
      }
    }
  }

  return docData;
};
