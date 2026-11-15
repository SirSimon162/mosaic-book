"use client";

import { useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Icon } from "./icons";
import {
  FolderPeekIcon,
  FolderShaderArt,
  type FolderPaletteKey,
} from "./folder-shader";

export type FolderActionType = "add" | "menu";

export type FolderCardData = {
  id: string;
  title: string;
  itemCount: number;
  coverTone?: string;
  actionType?: FolderActionType;
};

export type FolderCardProps = FolderCardData & {
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onActionClick?: () => void;
  className?: string;
};

const FOLDER_CLIP =
  "M0.055 0.02 H0.38 C0.42 0.02 0.445 0.04 0.46 0.07 C0.485 0.12 0.52 0.135 0.58 0.135 H0.945 C0.978 0.135 1 0.175 1 0.23 V0.92 C1 0.97 0.97 1 0.94 1 H0.06 C0.03 1 0 0.97 0 0.92 V0.10 C0 0.05 0.02 0.02 0.055 0.02 Z";

const FOLDER_EDGE =
  "M22 6 H152 C168 6 178 12 184 21 C194 36 208 40.5 232 40.5 H378 C391 40.5 400 52.5 400 69 V276 C400 290 390 300 376 300 H24 C10 300 0 290 0 276 V30 C0 15 9 6 22 6 Z";

function paletteOf(tone?: string): FolderPaletteKey {
  if (tone === "PDF" || tone === "WEBSITE" || tone === "YOUTUBE" || tone === "TEXT" || tone === "MARKDOWN") {
    return tone;
  }
  return "TEXT";
}

function seedOf(id: string, layer: number) {
  let hash = layer * 97;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  return hash / 100;
}

export function itemCountLabel(count: number) {
  return count === 1 ? "1 item" : `${count} items`;
}

export function FolderCard({
  id,
  title,
  itemCount,
  coverTone,
  actionType = "menu",
  selected = false,
  compact = false,
  onClick,
  onActionClick,
  className = "",
}: FolderCardProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `folderClip-${uid}`;
  const [hovered, setHovered] = useState(false);
  const countLabel = itemCountLabel(itemCount);
  const actionLabel = actionType === "add" ? `Add to ${title}` : `More options for ${title}`;
  const palette = paletteOf(coverTone);

  function handleAction(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onActionClick?.();
  }

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <article
      className={`m-folder${compact ? " is-compact" : ""} ${className}`.trim()}
      data-folder={id}
      data-tone={coverTone || undefined}
      data-action={actionType}
      data-selected={selected || undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      aria-label={onClick ? `${title}, ${countLabel}` : undefined}
      onClick={onClick}
      onKeyDown={handleKey}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="m-folder-stack">
        <div className="m-folder-back m-folder-back-2" aria-hidden>
          <FolderShaderArt palette={palette} seed={seedOf(id, 2)} dimmed hovered={hovered} />
        </div>
        <div className="m-folder-back m-folder-back-1" aria-hidden>
          <FolderShaderArt palette={palette} seed={seedOf(id, 1)} hovered={hovered} />
          <FolderPeekIcon tone={coverTone} />
        </div>

        <div className="m-folder-front">
          <div className="m-folder-glass" style={{ clipPath: `url(#${clipId})` }} />

          <svg className="m-folder-edge" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden>
            <defs>
              <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                <path d={FOLDER_CLIP} />
              </clipPath>
            </defs>
            <path d={FOLDER_EDGE} strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          <div className="m-folder-meta">
            <div className="min-w-0">
              <p className="m-folder-title">{title}</p>
              <p className="m-folder-count">{countLabel}</p>
            </div>
            {!compact && (
              <button
                type="button"
                className="m-folder-action"
                data-kind={actionType}
                aria-label={actionLabel}
                onClick={handleAction}
              >
                <Icon name={actionType === "add" ? "plus" : "more"} size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function FolderGrid({
  folders,
  selectedId,
  compact = false,
  onFolderClick,
  onFolderAction,
  className = "",
}: {
  folders: FolderCardData[];
  selectedId?: string | null;
  compact?: boolean;
  onFolderClick?: (folder: FolderCardData) => void;
  onFolderAction?: (folder: FolderCardData) => void;
  className?: string;
}) {
  return (
    <div className={`m-folder-grid${compact ? " is-compact" : ""} ${className}`.trim()}>
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          {...folder}
          compact={compact}
          selected={selectedId === folder.id}
          onClick={onFolderClick ? () => onFolderClick(folder) : undefined}
          onActionClick={onFolderAction ? () => onFolderAction(folder) : undefined}
        />
      ))}
    </div>
  );
}
