# Famigo repository instructions

## Project goals

Famigo is a family mobile app that encourages positive behaviors through daily point allocation, family goals, and a rewards shop.

## Working rules

- Always read files in /docs before making structural changes.
- Do not introduce unnecessary abstractions.
- Keep business logic outside UI components.
- Prefer simple, readable code over clever code.
- Document assumptions explicitly.
- For every significant change, provide:
  - a short plan
  - touched files
  - risks
  - tests added or missing

## Architecture rules

- Mobile app lives in apps/mobile
- Pure domain logic lives in packages/domain
- Shared UI lives in packages/ui only when reuse is real
- Do not couple domain logic to Supabase or React Native
- Favor vertical slices over premature generic systems

## Quality rules

- Add tests for critical business rules
- Do not change product rules silently
- Keep TypeScript strict
- Avoid dead code
