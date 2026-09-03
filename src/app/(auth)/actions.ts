"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  firstValidationMessage,
  loginSchema,
  safeNextPath,
  signupSchema,
} from "@/domain/auth";
import { getPublicEnv } from "@/server/env";
import { createClient } from "@/server/supabase/server";

function errorLocation(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function loginAction(formData: FormData) {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    redirect(errorLocation("/login", firstValidationMessage(result.error)));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    redirect(errorLocation("/login", "이메일 또는 비밀번호를 확인해 주세요."));
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function signupAction(formData: FormData) {
  const result = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    redirect(errorLocation("/signup", firstValidationMessage(result.error)));
  }

  const supabase = await createClient();
  const env = getPublicEnv();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { display_name: result.data.displayName },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    redirect(
      errorLocation(
        "/signup",
        "계정을 만들 수 없습니다. 잠시 후 다시 시도해 주세요.",
      ),
    );
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  redirect(`/check-email?email=${encodeURIComponent(result.data.email)}`);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login");
}
