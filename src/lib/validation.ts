import { z } from 'zod';

export const SignupSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(120, 'Name must be 120 characters or less'),
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email').max(254, 'Email must be 254 characters or less'),
  phone: z.string().trim().min(1, 'Phone is required').transform((v) => v.replace(/\D/g, '')).pipe(z.string().min(10, 'Phone must have at least 10 digits')),
  party_size: z.coerce.number().min(1, 'Party size must be at least 1').max(20, 'Party size must be 20 or less'),
  company: z.string().optional(), // honeypot
});

export type SignupData = z.infer<typeof SignupSchema>;
