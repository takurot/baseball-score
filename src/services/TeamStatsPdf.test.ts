import { readFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import { createTeamStatsPdf } from './TeamStatsPdf';
import { buildTeamReportStats } from '../firebase/statsService';
jest.mock('../firebase/config', () => ({ db: {} }));
jest.mock('../firebase/authService', () => ({}));
jest.setTimeout(60000);
const font = readFileSync('public/fonts/NotoSansJP.ttf');
const sections = (count: number) =>
  buildTeamReportStats([], {
    id: 't',
    name: '日本語チーム',
    userId: 'u',
    players: Array.from({ length: count }, (_, i) => ({
      id: String(i),
      name: `選手${i}`,
      number: String(i),
      position: '',
    })),
  });
test('creates three landscape A4 pages and continuation pages without losing sections', async () => {
  for (const count of [0, 1, 30, 31, 100]) {
    const bytes = await createTeamStatsPdf(
      sections(count),
      font.buffer.slice(
        font.byteOffset,
        font.byteOffset + font.byteLength
      ) as ArrayBuffer,
      new Date('2026-11-07T00:00:00Z'),
      () => {}
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
    if (count < 2) expect(pdf.getPageCount()).toBe(3);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(841.89);
      expect(page.getHeight()).toBeCloseTo(595.28);
    }
  }
});
test('rejects unsupported glyphs and cancellation instead of returning a partial file', async () => {
  const data = sections(1);
  data[0].teamName = '😀';
  await expect(
    createTeamStatsPdf(data, font.buffer as ArrayBuffer, new Date(), () => {})
  ).rejects.toThrow('文字');
  await expect(
    createTeamStatsPdf(
      sections(1),
      font.buffer as ArrayBuffer,
      new Date(),
      () => {
        throw new Error('中止');
      }
    )
  ).rejects.toThrow('中止');
});
test('rejects table headers below the printable area for long team names', async () => {
  const data = sections(0);
  data.forEach((section) => {
    section.teamName = 'あ'.repeat(1800);
  });
  await expect(
    createTeamStatsPdf(data, font.buffer as ArrayBuffer, new Date(), () => {})
  ).rejects.toThrow('ページ');
});
