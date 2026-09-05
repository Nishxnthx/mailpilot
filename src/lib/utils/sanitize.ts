import DOMPurify from 'dompurify';

let hookAdded = false;

export function isLightColor(colorStr: string): boolean {
  if (!colorStr) return false;
  const c = colorStr.trim().toLowerCase();
  if (
    c === 'white' ||
    c === '#fff' ||
    c === '#ffffff' ||
    c.startsWith('#f8f') ||
    c.startsWith('#f1f') ||
    c.startsWith('#e2e') ||
    c.startsWith('#fff') ||
    c.startsWith('#faf') ||
    c.startsWith('#eee') ||
    c.startsWith('#ddd') ||
    c.startsWith('#ccc') ||
    c.startsWith('#bbb') ||
    c.startsWith('#aaa') ||
    c.startsWith('#999') ||
    c === 'lightgray' ||
    c === 'lightgrey'
  ) {
    return true;
  }
  if (c.startsWith('rgb')) {
    const matches = c.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = parseInt(matches[0], 10);
      const g = parseInt(matches[1], 10);
      const b = parseInt(matches[2], 10);
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness > 170) return true;
    }
  }
  if (c.startsWith('#') && (c.length === 4 || c.length === 7)) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((x) => x + x).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness > 170) return true;
    }
  }
  return false;
}

export function isDarkColor(colorStr: string): boolean {
  if (!colorStr) return false;
  const c = colorStr.trim().toLowerCase();
  if (
    c.includes('#0') ||
    c.includes('#1') ||
    c.includes('#2') ||
    c.includes('#3') ||
    c.includes('#4') ||
    c.includes('#5') ||
    c.includes('black') ||
    c.includes('dark') ||
    c.includes('navy') ||
    c.includes('purple') ||
    c.includes('blue') ||
    c.includes('indigo')
  ) {
    return true;
  }
  if (c.startsWith('rgb')) {
    const matches = c.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = parseInt(matches[0], 10);
      const g = parseInt(matches[1], 10);
      const b = parseInt(matches[2], 10);
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < 185) return true;
    }
  }
  if (c.startsWith('#') && (c.length === 4 || c.length === 7)) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((x) => x + x).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < 185) return true;
    }
  }
  return false;
}

export function normalizeHtmlContrast(html: string): string {
  if (!html || typeof window === 'undefined') return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    function processNode(node: Element, parentTextColor: string | null, parentHasDarkBg: boolean) {
      const style = node.getAttribute('style') || '';
      let elementTextColor = parentTextColor;
      let elementHasDarkBg = parentHasDarkBg;

      const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
      const htmlBg = node.getAttribute('bgcolor');
      if (bgMatch) {
        elementHasDarkBg = isDarkColor(bgMatch[1].trim());
      } else if (htmlBg) {
        elementHasDarkBg = isDarkColor(htmlBg.trim());
      }

      const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      const fontColor = node.getAttribute('color');

      if (colorMatch) {
        elementTextColor = colorMatch[1].trim();
      } else if (fontColor) {
        elementTextColor = fontColor.trim();
      }

      if (elementTextColor && isLightColor(elementTextColor) && !elementHasDarkBg) {
        if (colorMatch) {
          const newStyle = style
            .replace(/(?:^|;)\s*color\s*:\s*[^;]+/gi, '; color: #222222')
            .replace(/^;\s*/, '');
          node.setAttribute('style', newStyle);
        } else if (fontColor) {
          node.setAttribute('color', '#222222');
        } else {
          const newStyle = style ? `color: #222222; ${style}` : 'color: #222222';
          node.setAttribute('style', newStyle);
        }
        elementTextColor = '#222222';
      }

      Array.from(node.children).forEach((child) => {
        processNode(child, elementTextColor, elementHasDarkBg);
      });
    }

    Array.from(body.children).forEach((child) => {
      processNode(child, null, false);
    });

    return body.innerHTML;
  } catch {
    return html;
  }
}

function setupDomPurifyHooks() {
  if (!hookAdded && typeof window !== 'undefined') {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if ('tagName' in node && node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    hookAdded = true;
  }
}

/**
 * Robust, DOMPurify-backed HTML sanitizer for email HTML content.
 * Strips script, iframe, object, embed, form tags, javascript: links, and inline event handlers.
 * Enforces safe external link attributes (target="_blank", rel="noopener noreferrer").
 * Normalizes unreadable light text (direct or inherited) on light canvas backgrounds while preserving contrast & formatting.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  if (typeof window === 'undefined') {
    // SSR fallback: basic tag removal if executed on server
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  }

  setupDomPurifyHooks();

  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
  });

  return normalizeHtmlContrast(sanitized);
}
