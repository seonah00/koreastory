import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해 주세요.").max(254),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
});

export const signupSchema = loginSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(2, "이름은 2자 이상이어야 합니다.")
    .max(40, "이름은 40자 이하여야 합니다."),
});

export function safeNextPath(value: FormDataEntryValue | string | null) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}

export function firstValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "입력값을 다시 확인해 주세요.";
}
