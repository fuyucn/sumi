"use server";
import { resolveDeps } from "@/lib/session";
import {
  runAddComment,
  runDeleteComment,
  runDeleteMagazine,
  runSaveMagazine,
  runSaveProfile,
  runToggleFollow,
  runToggleLike,
} from "./actions-core";

export async function addCommentAction(form: unknown) {
  return runAddComment(await resolveDeps(), form, new Date());
}

export async function deleteCommentAction(form: unknown) {
  return runDeleteComment(await resolveDeps(), form);
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

export async function toggleLikeAction(form: unknown) {
  return runToggleLike(await resolveDeps(), form, new Date());
}

export async function toggleFollowAction(form: unknown) {
  return runToggleFollow(await resolveDeps(), form, new Date());
}
