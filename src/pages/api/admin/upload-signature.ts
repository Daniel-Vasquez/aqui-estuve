import type { APIRoute } from 'astro';
import { json } from '@/lib/http';
import { signUpload } from '@/lib/cloudinary';

export const POST: APIRoute = () => json(signUpload());
