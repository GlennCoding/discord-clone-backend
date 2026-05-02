import mongoose from 'mongoose';

import type { ClientSession } from 'mongoose';

export async function withTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    try {
      return await session.withTransaction(() => work(session));
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('Transaction numbers are only allowed') ||
          error.message.includes('Replica set required'))
      ) {
        // Fallback for environments without replica set support
        return await work(session);
      }
      throw error;
    }
  } finally {
    await session.endSession();
  }
}
