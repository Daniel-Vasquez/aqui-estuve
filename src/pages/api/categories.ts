import type { APIRoute } from 'astro';
import { json } from '@/lib/http';
import { listCategories } from '@/lib/photos/category-repository';

export const GET: APIRoute = async () => json({ categories: await listCategories() });
