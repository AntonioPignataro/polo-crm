# Plan: Refactor Member Creation — Link Parents by Email + Add Responsável

## Summary

1. **Make `userId` optional** on `Parent` model — allows creating parent records before the parent has registered
2. **Refactor member creation action** — stop creating `User` records for parents; instead link to existing accounts by email
3. **Add responsável support** to member creation form — a button that can be clicked multiple times, asks male/female, then shows parent fields
4. **No changes** to self-registration, Sex enum, or ParentRelationship enum

---

## Step 1: Schema Change (`prisma/schema.prisma`)

- Make `userId` optional (`String?`) and remove `@unique` on it
- This allows `Parent` records to exist without a linked User account
- Run `prisma db push` + `prisma generate`

## Step 2: Refactor Member Creation Action (`create-member.ts`)

For each parent entry (father, mother, responsável):
- If email is provided:
  - Look up existing `User` by email + clubId
  - If User found → check if a `Parent` record exists for that user
    - If Parent exists → just create `MemberParent` link
    - If no Parent → create `Parent` with `userId` set → create `MemberParent`
  - If no User found → create `Parent` without `userId` (orphaned, linked later when parent registers) → create `MemberParent`
- If no email provided:
  - Create `Parent` without `userId` → create `MemberParent`
- **Stop creating `User` records entirely** during member creation
- Set `sex` based on: father → `MASCULINO`, mother → `FEMININO`, responsável → based on user selection

## Step 3: Update Self-Registration Action (`register.ts`)

- After creating the `User`, check if any `Parent` records exist with that email and no `userId`
- If found, link them by setting `userId` on those Parent records
- No UI changes to the registration form

## Step 4: Update Member Creation Schema (`member-schema.ts`)

- Add `responsaveis` field: an optional array of objects with:
  - `sex`: `"MASCULINO" | "FEMININO"`
  - Same fields as father/mother: `fullName`, `phone`, `email`, `cpf`, `profession`

## Step 5: Update Member Creation Form (`novo-socio-form.tsx`)

- Keep existing "Dados do Pai" and "Dados da Mãe" sections unchanged
- Add a "+ Adicionar Responsável" button below the parent sections
- When clicked, show a prompt: "Responsável" (masculino) or "Responsável" (feminino)
- After selecting, render a new card with the same fields (name, cpf, phone, email, profession) + a remove button
- The button can be clicked again to add more responsáveis

## Step 6: Update Enrollment Data Query (`get-enrollment-data.ts`)

- Update the parent lookup logic to handle multiple responsáveis (currently it only looks for one `RESPONSAVEL`)
