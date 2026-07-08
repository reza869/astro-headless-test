/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Active market country (ISO alpha-2) selected via the currency switcher. */
    country?: string;
  }
}
