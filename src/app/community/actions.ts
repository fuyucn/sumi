"use server";
import { resolveDeps } from "@/lib/session";
import {
  runAddComment,
  runAddFriend,
  runAddNote,
  runDeleteComment,
  runDeleteFriend,
  runDeleteMagazine,
  runDeleteNote,
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

export async function addNoteAction(form: unknown) {
  return runAddNote(await resolveDeps(), form, new Date());
}

export async function deleteNoteAction(form: unknown) {
  return runDeleteNote(await resolveDeps(), form);
}

export async function addFriendAction(form: unknown) {
  return runAddFriend(await resolveDeps(), form, new Date());
}

export async function deleteFriendAction(form: unknown) {
  return runDeleteFriend(await resolveDeps(), form);
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
