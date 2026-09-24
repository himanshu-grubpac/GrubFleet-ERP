# ADR 001 — Modular monolith

**Status:** Accepted  
**Date:** 2026-09-24

## Context

GrubPac ERP needs clear domain boundaries without operational overhead of many services at pilot scale.

## Decision

Single NestJS API and single Next.js app in an npm workspace monorepo. Shared packages hold types and validation only.

## Consequences

- Simpler deploy and local dev
- Enforce module boundaries via code review and Nest module imports
- Extract services later only if scale or team boundaries require it
