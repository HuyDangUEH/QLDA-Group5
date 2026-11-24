/**
 * Tài liệu kỹ thuật không có link hỏng: mọi link nội bộ (tương đối) trong README.md và docs/*.md
 * phải trỏ tới file / thư mục có thật trong repo. Link http(s), mailto và neo trong trang (#...) bỏ qua.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DOCS = [path.join(ROOT, 'README.md'), ...readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => path.join(ROOT, 'docs', f))];

/** Link Markdown [chữ](đích) và <img src="đích">, bỏ qua phần trong khối code ``` */
function linksOf(markdown: string): string[] {
  const text = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const md = [...text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]!);
  const img = [...text.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]!);
  return [...md, ...img];
}

const isInternal = (href: string) => !/^(https?:|mailto:|#)/i.test(href);

describe('Tài liệu kỹ thuật: link nội bộ không hỏng', () => {
  it('có README và các tài liệu chính', () => {
    for (const f of ['README.md', 'docs/api.md', 'docs/database.md', 'docs/deployment.md', 'docs/business-rules.md', 'docs/security.md', 'docs/payments.md', 'docs/cong-nghe.md', 'docs/release-v1.0.md']) {
      expect(existsSync(path.join(ROOT, f)), f).toBe(true);
    }
  });

  it.each(DOCS.map((f) => [path.relative(ROOT, f).replace(/\\/g, '/'), f] as const))('%s', (_name, file) => {
    const broken = linksOf(readFileSync(file, 'utf8'))
      .filter(isInternal)
      .map((href) => decodeURIComponent(href.split('#')[0]!))
      .filter((target) => target && !existsSync(path.resolve(path.dirname(file), target)));
    expect(broken, 'link trỏ tới file không tồn tại').toEqual([]);
  });
});
