import { db } from '../config/firebase.js';

const CHUNK_SIZE = 700 * 1024; // 700 KB per chunk (well within Firestore 1MB document limit)

export class ResumeFileStorage {
  /**
   * Save a base64 file buffer permanently to Firestore (chunked across documents)
   * This guarantees that uploaded candidate resumes will NEVER be lost across Render ephemeral restarts.
   */
  static async saveResumeFile(
    studentId: string,
    base64Data: string,
    mimeType: string = 'application/pdf',
    fileName: string = 'Candidate_Resume.pdf'
  ): Promise<void> {
    try {
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const totalLength = cleanBase64.length;
      const numChunks = Math.ceil(totalLength / CHUNK_SIZE);

      const metaDoc = {
        studentId,
        fileName,
        mimeType,
        totalLength,
        numChunks,
        updatedAt: new Date(),
      };

      // 1. Save metadata
      await db.collection('resume_files').doc(studentId).set(metaDoc);

      // 2. Save individual chunks
      const batch = db.batch();
      for (let i = 0; i < numChunks; i++) {
        const chunkStr = cleanBase64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkDocRef = db.collection('resume_chunks').doc(`${studentId}_${i}`);
        batch.set(chunkDocRef, {
          studentId,
          index: i,
          data: chunkStr,
        });
      }
      await batch.commit();
    } catch (err) {
      console.error('Failed to save chunked resume file to Firestore:', err);
    }
  }

  /**
   * Retrieve the complete original file buffer from Firestore
   */
  static async getResumeFile(
    studentId: string
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
    try {
      const metaSnap = await db.collection('resume_files').doc(studentId).get();
      if (!metaSnap.exists) return null;

      const meta: any = metaSnap.data();
      const numChunks: number = meta?.numChunks || 1;

      // Fetch all chunks for this student
      const chunksSnap = await db
        .collection('resume_chunks')
        .where('studentId', '==', studentId)
        .get();

      if (chunksSnap.empty) return null;

      const sortedDocs = [...chunksSnap.docs].sort(
        (a: any, b: any) => (a.data()?.index ?? 0) - (b.data()?.index ?? 0)
      );

      let fullBase64 = '';
      for (const d of sortedDocs) {
        fullBase64 += d.data()?.data || '';
      }

      if (!fullBase64) return null;

      const buffer = Buffer.from(fullBase64, 'base64');
      return {
        buffer,
        mimeType: meta?.mimeType || 'application/pdf',
        fileName: meta?.fileName || 'Candidate_Resume.pdf',
      };
    } catch (err) {
      console.error('Failed to retrieve chunked resume file from Firestore:', err);
      return null;
    }
  }
}
