"use server";
import { resolveDeps } from "@/lib/session";
import {
  runAddComment,
  runDeleteMagazine,
  runSaveMagazine,
  runSaveProfile,
} from "./actions-core";

export async function addCommentAction(form: unknown) {
  return runAddComment(await resolveDeps(), form, new Date());
}

export async function saveProfileAction(form: unknown) {
  return runSaveProfile(await resolveDeps(), form);
}

export async function saveMagazineAction(form: unknown) {
  return runSaveMagazine(await resolveDeps(), form);
}

export async function deleteMagazineAction(slug: string) {
  return runDeleteMagazine(await resolveDeps(), slug);
}
