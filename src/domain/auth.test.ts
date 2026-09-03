import { describe, expect, it } from "vitest";

import { loginSchema, safeNextPath, signupSchema } from "@/domain/auth";

describe("auth input", () => {
  it("accepts valid login credentials", () => {
    expect(
      loginSchema.safeParse({
        email: "story@example.com",
        password: "password123",
      }).success,
    ).toBe(true);
  });

  it("rejects short passwords and display names", () => {
    expect(
      loginSchema.safeParse({ email: "story@example.com", password: "short" })
        .success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({
        email: "story@example.com",
        password: "password123",
        displayName: "K",
      }).success,
    ).toBe(false);
  });

  it("only permits local redirect paths", () => {
    expect(safeNextPath("/stories/1")).toBe("/stories/1");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
  });
});
