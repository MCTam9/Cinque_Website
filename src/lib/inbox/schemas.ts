import { z } from 'zod';

/** Request bodies for /api/agent/draft and /api/agent/track. */

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const trackSchema = z
  .object({
    status: z.enum(['track', 'closed', 'ignored']).optional(),
    topic: z
      .enum(['madeToOrder', 'bespoke', 'sizing', 'shipping', 'orderIssue', 'other'])
      .optional(),
    followUpOn: ymd.optional(),
    followUpReason: z
      .enum(['noReply', 'christmasCutoff', 'customerAskedLater', 'other'])
      .optional(),
    note: z.string().max(200).optional(),
  })
  .strict();

const itemRef = {
  id: z.string().min(6).max(450),
  ticket: z.string().min(10).max(200),
};

export const draftSchema = z
  .object({ ...itemRef, body: z.string().min(20).max(6_000), track: trackSchema.optional() })
  .strict();

export const trackBodySchema = z.object({ ...itemRef, track: trackSchema }).strict();
