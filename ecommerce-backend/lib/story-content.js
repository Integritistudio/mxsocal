const allowedChildren = {
  doc: ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'horizontalRule'],
  paragraph: ['text', 'hardBreak'], heading: ['text', 'hardBreak'],
  bulletList: ['listItem'], orderedList: ['listItem'], listItem: ['paragraph', 'bulletList', 'orderedList'],
  blockquote: ['paragraph', 'heading', 'bulletList', 'orderedList'],
  text: [], hardBreak: [], horizontalRule: [],
};
const safeLink = value => {
  if (typeof value !== 'string' || value.length > 1500 || /[\x00-\x20\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
};
function cleanDocument(document) {
  if (!document || document.type !== 'doc' || JSON.stringify(document).length > 85000) throw new Error('The article is too large or its format is invalid.');
  let count = 0;
  function visit(node, depth = 0) {
    if (!node || typeof node !== 'object' || ++count > 4000 || depth > 12 || !Object.hasOwn(allowedChildren, node.type)) throw new Error('Unsupported article formatting.');
    const result = { type: node.type };
    if (node.type === 'text') {
      if (typeof node.text !== 'string' || !node.text) throw new Error('Invalid article text.');
      result.text = node.text;
      if (node.marks !== undefined) {
        if (!Array.isArray(node.marks) || node.marks.length > 6) throw new Error('Unsupported text formatting.');
        result.marks = node.marks.map(mark => {
          if (!['bold', 'italic', 'strike', 'code', 'link', 'underline'].includes(mark?.type)) throw new Error('Unsupported text formatting.');
          if (mark.type === 'link') { if (!safeLink(mark.attrs?.href)) throw new Error('Links must use an http, https, or local website address.'); return { type: 'link', attrs: { href: mark.attrs.href } }; }
          return { type: mark.type };
        });
      }
    }
    if (node.type === 'heading') { if (![2, 3, 4].includes(node.attrs?.level)) throw new Error('Use Heading 2, 3, or 4 in articles.'); result.attrs = { level: node.attrs.level }; }
    if (node.type === 'orderedList') result.attrs = { start: Number.isInteger(node.attrs?.start) && node.attrs.start > 0 && node.attrs.start < 1000 ? node.attrs.start : 1 };
    if (node.content !== undefined) {
      if (!Array.isArray(node.content) || node.content.some(child => !allowedChildren[node.type].includes(child?.type))) throw new Error('Invalid article structure.');
      result.content = node.content.map(child => visit(child, depth + 1));
    }
    return result;
  }
  return visit(document);
}
const plainText = node => node?.type === 'text' ? node.text : (node?.content || []).map(plainText).join(' ');
module.exports = { cleanDocument, plainText, safeLink };
