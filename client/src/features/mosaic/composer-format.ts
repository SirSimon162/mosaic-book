/** Serialize a contenteditable tree to Markdown for chat storage/send. */
export function htmlToMarkdown(root: HTMLElement): string {
  return nodesToMarkdown(Array.from(root.childNodes)).replace(/\n{3,}/g, "\n\n").trim();
}

function nodesToMarkdown(nodes: ChildNode[]): string {
  return nodes.map((node) => nodeToMarkdown(node)).join("");
}

function styleLooksBold(el: HTMLElement) {
  const weight = (el.style.fontWeight || "").trim().toLowerCase();
  if (!weight) return false;
  if (weight === "bold" || weight === "bolder") return true;
  const numeric = Number(weight);
  return Number.isFinite(numeric) && numeric >= 600;
}

function styleLooksItalic(el: HTMLElement) {
  const style = (el.style.fontStyle || "").trim().toLowerCase();
  return style === "italic" || style === "oblique";
}

function wrapMarkdown(inner: string, bold: boolean, italic: boolean) {
  if (!inner) return "";
  if (bold && italic) return `***${inner}***`;
  if (bold) return `**${inner}**`;
  if (italic) return `_${inner}_`;
  return inner;
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = nodesToMarkdown(Array.from(el.childNodes));

  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") return wrapMarkdown(inner, true, false);
  if (tag === "em" || tag === "i") return wrapMarkdown(inner, false, true);
  if (tag === "code") {
    if (el.closest("pre")) return inner;
    return inner ? `\`${inner.replace(/`/g, "\\`")}\`` : "";
  }
  if (tag === "pre") {
    const code = el.querySelector("code");
    const body = (code?.textContent ?? el.textContent ?? "").replace(/\n$/, "");
    return `\n\`\`\`\n${body}\n\`\`\`\n`;
  }
  if (tag === "div" || tag === "p") {
    const text = nodesToMarkdown(Array.from(el.childNodes));
    return text ? `${text}\n` : "\n";
  }
  if (tag === "ul") {
    return (
      Array.from(el.children)
        .map((li) => `- ${nodesToMarkdown(Array.from(li.childNodes)).trim()}`)
        .join("\n") + "\n"
    );
  }
  if (tag === "ol") {
    return (
      Array.from(el.children)
        .map((li, index) => `${index + 1}. ${nodesToMarkdown(Array.from(li.childNodes)).trim()}`)
        .join("\n") + "\n"
    );
  }
  if (tag === "span" || tag === "font") {
    return wrapMarkdown(inner, styleLooksBold(el), styleLooksItalic(el));
  }
  return wrapMarkdown(inner, styleLooksBold(el), styleLooksItalic(el));
}

export function editorIsEmpty(root: HTMLElement) {
  const text = root.innerText.replace(/\u00a0/g, " ").trim();
  return text.length === 0;
}

export function clearEditor(root: HTMLElement) {
  root.innerHTML = "";
}

export type FormatKind = "bold" | "italic" | "code" | "block";

export function applyEditorFormat(kind: FormatKind) {
  const selection = window.getSelection();
  if (!selection) return;

  if (kind === "bold") {
    toggleInlineTag(selection, "strong");
    return;
  }
  if (kind === "italic") {
    toggleInlineTag(selection, "em");
    return;
  }
  if (kind === "code") {
    toggleInlineCode(selection);
    return;
  }
  insertCodeBlock(selection);
}

function toggleInlineTag(selection: Selection, tagName: "strong" | "em") {
  if (!selection.rangeCount) return;
  const anchor = selection.anchorNode;
  const existing =
    anchor instanceof Element ? anchor.closest(tagName) : anchor?.parentElement?.closest(tagName);
  if (existing) {
    const text = document.createTextNode(existing.textContent ?? "");
    existing.replaceWith(text);
    selection.removeAllRanges();
    const range = document.createRange();
    range.setStartAfter(text);
    range.collapse(true);
    selection.addRange(range);
    return;
  }

  if (selection.isCollapsed) {
    const el = document.createElement(tagName);
    el.append(tagName === "strong" ? "bold" : "italic");
    const range = selection.getRangeAt(0);
    range.insertNode(el);
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  const range = selection.getRangeAt(0);
  const el = document.createElement(tagName);
  el.append(range.extractContents());
  range.insertNode(el);
  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(el);
  selection.addRange(next);
}

function toggleInlineCode(selection: Selection) {
  if (!selection.rangeCount) return;
  const anchor = selection.anchorNode;
  const existing = anchor instanceof Element ? anchor.closest("code") : anchor?.parentElement?.closest("code");
  if (existing && !existing.closest("pre")) {
    const text = document.createTextNode(existing.textContent ?? "");
    existing.replaceWith(text);
    selection.removeAllRanges();
    const range = document.createRange();
    range.setStartAfter(text);
    range.collapse(true);
    selection.addRange(range);
    return;
  }

  if (selection.isCollapsed) {
    const code = document.createElement("code");
    code.className = "m-composer-code";
    code.append("code");
    const range = selection.getRangeAt(0);
    range.insertNode(code);
    range.selectNodeContents(code);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  const range = selection.getRangeAt(0);
  const code = document.createElement("code");
  code.className = "m-composer-code";
  code.append(range.extractContents());
  range.insertNode(code);
  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(code);
  selection.addRange(next);
}

function insertCodeBlock(selection: Selection) {
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const selected = selection.isCollapsed ? "code" : range.toString();
  if (!selection.isCollapsed) range.deleteContents();

  const pre = document.createElement("pre");
  pre.className = "m-composer-pre";
  const code = document.createElement("code");
  code.textContent = selected;
  pre.append(code);

  range.insertNode(pre);
  const spacer = document.createElement("div");
  spacer.append(document.createElement("br"));
  pre.after(spacer);

  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(code);
  selection.addRange(next);
}

function ancestorHasFormat(el: Element, kind: "bold" | "italic") {
  let current: Element | null = el;
  while (current) {
    if (kind === "bold") {
      const tag = current.tagName.toLowerCase();
      if (tag === "strong" || tag === "b" || styleLooksBold(current as HTMLElement)) return true;
    } else {
      const tag = current.tagName.toLowerCase();
      if (tag === "em" || tag === "i" || styleLooksItalic(current as HTMLElement)) return true;
    }
    if ((current as HTMLElement).isContentEditable && current.getAttribute("contenteditable") === "true") break;
    current = current.parentElement;
  }
  return false;
}

export function queryFormatActive(kind: FormatKind): boolean {
  const selection = window.getSelection();
  if (!selection?.anchorNode) return false;
  const node = selection.anchorNode;
  const el = node instanceof Element ? node : node.parentElement;
  if (!el) return false;
  if (kind === "bold") return ancestorHasFormat(el, "bold");
  if (kind === "italic") return ancestorHasFormat(el, "italic");
  if (kind === "code") return Boolean(el.closest("code") && !el.closest("pre"));
  return Boolean(el.closest("pre"));
}
