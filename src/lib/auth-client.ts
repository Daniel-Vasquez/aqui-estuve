import { createAuthClient } from 'better-auth/react';

// Mismo origen: baseURL se infiere de window.location; basePath por defecto /api/auth.
export const authClient = createAuthClient();
