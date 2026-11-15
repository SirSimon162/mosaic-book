/** Serialize a contenteditable tree to Markdown for chat storage/send. */
export function htmlToMarkdown(root: HTMLElement): string {
  return nodesToMarkdown(Array.from(root.childNodes)).replace(/\n{3,}/g, "\n\n").trim();
}

function nodesToMarkdown(nodes: ChildNode[]): string {
  return nodes.map((node) => nodeToMarkdown(node)).join("");
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
  if (tag === "strong" || tag === "b") return inner ? `**${inner}**` : "";
  if (tag === "em" || tag === "i") return inner ? `_${inner}_` : "";
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
  return inner;
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
    document.execCommand("bold");
    return;
  }
  if (kind === "italic") {
    document.execCommand("italic");
    return;
  }
  if (kind === "code") {
    toggleInlineCode(selection);
    return;
  }
  insertCodeBlock(selection);
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

export function queryFormatActive(kind: FormatKind): boolean {
  if (kind === "bold") return document.queryCommandState("bold");
  if (kind === "italic") return document.queryCommandState("italic");
  const selection = window.getSelection();
  if (!selection?.anchorNode) return false;
  const node = selection.anchorNode;
  const el = node instanceof Element ? node : node.parentElement;
  if (!el) return false;
  if (kind === "code") return Boolean(el.closest("code") && !el.closest("pre"));
  return Boolean(el.closest("pre"));
}
