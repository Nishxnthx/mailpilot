/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/utils/sanitize';

describe('HTML Sanitization Utility & Contrast Normalization', () => {
  it('strips <script> tags and inner code execution', () => {
    const maliciousHtml = '<div>Hello <script>alert("xss")</script> World</div>';
    const sanitized = sanitizeHtml(maliciousHtml);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('Hello');
    expect(sanitized).toContain('World');
  });

  it('strips inline event handler attributes (onload, onclick, onerror)', () => {
    const maliciousHtml = '<img src="valid.png" onload="alert(1)" onerror="console.log(2)" />';
    const sanitized = sanitizeHtml(maliciousHtml);
    expect(sanitized).not.toContain('onload');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).toContain('src="valid.png"');
  });

  it('neutralizes javascript: URLs in links', () => {
    const maliciousHtml = '<a href="javascript:alert(1)">Click me</a>';
    const sanitized = sanitizeHtml(maliciousHtml);
    expect(sanitized).not.toContain('href="javascript:');
  });

  it('enforces target="_blank" and rel="noopener noreferrer" on safe external links', () => {
    const html = '<a href="https://example.com">Example Site</a>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain('target="_blank"');
    expect(sanitized).toContain('rel="noopener noreferrer"');
    expect(sanitized).toContain('href="https://example.com"');
  });

  it('preserves valid HTML formatting (headings, lists, bold, tables, images)', () => {
    const html = `
      <h1>Title</h1>
      <p>Paragraph with <b>bold</b> text.</p>
      <ul><li>Item 1</li></ul>
      <table><tr><td>Cell</td></tr></table>
      <img src="https://example.com/logo.png" alt="Logo" />
    `;
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain('<h1>Title</h1>');
    expect(sanitized).toContain('<b>bold</b>');
    expect(sanitized).toContain('<ul>');
    expect(sanitized).toContain('<table>');
    expect(sanitized).toContain('img');
  });

  // 1. Direct white text on white background -> dark readable text
  it('normalizes direct white text on white background to dark readable text', () => {
    const html = '<div style="color: white">its not fun fact</div>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain('style="color: #222222"');
    expect(sanitized).toContain('its not fun fact');
  });

  // 2. Inherited white text from parent on white background -> dark readable text
  it('normalizes inherited white text from parent on white background to dark readable text', () => {
    const html = '<div style="color: #ffffff"><p><span>its not fun fact</span></p></div>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain('style="color: #222222"');
    expect(sanitized).toContain('its not fun fact');
  });

  // 3. White text on a dark background -> remains white
  it('preserves white text on a dark background', () => {
    const html = '<div style="background-color: #1e293b; color: white"><span>White text on dark banner</span></div>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain('color: white');
    expect(sanitized).toContain('White text on dark banner');
  });

  // 4. Normal dark text -> unchanged
  it('preserves normal dark text without altering style', () => {
    const html = '<p style="color: #333333">Normal dark text</p>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain('style="color: #333333"');
    expect(sanitized).toContain('Normal dark text');
  });

  // 5. Legitimate colored text with sufficient contrast -> unchanged
  it('preserves legitimate colored text with sufficient contrast', () => {
    const html = '<a href="https://example.com" style="background-color: #ff7555; color: #ffffff;">Apply Now</a>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toContain('color: #ffffff');
    expect(sanitized).toContain('Apply Now');
  });

  it('handles empty input gracefully', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
