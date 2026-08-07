"use client";
import {
  ArrowBendUpLeft,
  ChatCircle,
  Heart,
  Sparkle,
  UserPlus,
  type Icon,
} from "@phosphor-icons/react";
import type { NotificationType } from "@/content/types";

const typeIcons: Record<NotificationType, Icon> = {
  comment: ChatCircle,
  reply: ArrowBendUpLeft,
  like: Heart,
  follow: UserPlus,
  ai: Sparkle,
};

export function NotificationIcon({
  type,
  read,
}: {
  type: NotificationType;
  read: boolean;
}) {
  const IconComp = typeIcons[type] ?? ChatCircle;
  return <IconComp size={16} weight={read ? "regular" : "duotone"} />;
}
