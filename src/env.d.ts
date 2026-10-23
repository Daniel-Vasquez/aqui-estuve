/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('./lib/auth').AuthSession['user'] | null;
    session: import('./lib/auth').AuthSession['session'] | null;
  }
}
