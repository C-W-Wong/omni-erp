import { db } from '../db';

type NumberType = 'batch' | 'sales' | 'purchase' | 'transfer' | 'journal';

const prefixes: Record<NumberType, string> = {
  batch: 'BTH',
  sales: 'SO',
  purchase: 'PO',
  transfer: 'TR',
  journal: 'JE',
};

/**
 * Generate a unique number for orders, batches, etc.
 * Format: PREFIX-YYYYMMDD-XXXX
 */
export async function generateNumber(type: NumberType): Promise<string> {
  const prefix = prefixes[type];
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count existing numbers for today
  let count = 0;

  if (type === 'batch') {
    const result = await db.batch.count({
      where: {
        batchNumber: {
          startsWith: `${prefix}-${dateStr}-`,
        },
      },
    });
    count = result;
  }
  // Add other types as needed

  // Generate next number (padded to 4 digits)
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${nextNum}`;
}

/**
 * Get the next available batch number
 */
export async function getNextBatchNumber(): Promise<string> {
  return generateNumber('batch');
}
