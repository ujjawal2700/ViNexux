import { z } from 'zod';

export const pushTokenSchema = {
  body: z.object({
    token: z
      .string({ required_error: 'Push notification token is required' })
      .trim()
      .min(10, { message: 'Push notification token looks invalid' }),
  }),
};
