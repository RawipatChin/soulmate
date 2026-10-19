type Sequence = { year: unknown; number: unknown };

function signature(value: Sequence): string {
  return `${value.year}:${value.number}`;
}

/** Retry a denied checkout only when another order advanced the shared sequence. */
export async function retryOrderSequenceConflict<T>(
  save: (recordSequence: (sequence: Sequence) => void) => Promise<T>,
  readCurrentSequence: () => Promise<Sequence>,
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let observed: string | null = null;
    try {
      return await save((sequence) => { observed = signature(sequence); });
    } catch (error) {
      if (attempt === maxAttempts - 1 || (error as { code?: unknown })?.code !== 'permission-denied' || observed === null) {
        throw error;
      }
      let current: Sequence;
      try {
        current = await readCurrentSequence();
      } catch {
        throw error;
      }
      if (signature(current) === observed) throw error;
    }
  }
  throw new Error('บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง');
}
