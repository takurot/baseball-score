import { PDFFont, PDFPage, RGB, rgb } from 'pdf-lib';

export const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
export const LEFT = 24;
export const WIDTH = 793;
export const TOP = 572;
export const BOTTOM = 36;
export const TABLE_SIZE = 8;

const color = (r: number, g: number, b: number) =>
  rgb(r / 255, g / 255, b / 255);
export const PAPER = {
  ink: color(23, 59, 58),
  cream: color(255, 248, 231),
  teal: color(43, 168, 162),
  mist: color(232, 246, 245),
  stripe: color(246, 248, 248),
  rule: color(176, 196, 194),
  divider: color(76, 112, 110),
  gold: color(255, 210, 63),
  coral: color(239, 108, 74),
};

export interface PdfText {
  font: PDFFont;
  wrap: (text: string, width: number, size?: number) => string[];
}

export const inkText = (
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size = TABLE_SIZE
) => page.drawText(text, { x, y, size, font, color: PAPER.ink });

export function card(
  page: PDFPage,
  x: number,
  top: number,
  width: number,
  height: number,
  fill: RGB,
  accent: RGB
) {
  const r = 5;
  page.drawSvgPath(
    `M ${r} 0 H ${width - r} Q ${width} 0 ${width} ${r} V ${height - r} Q ${width} ${height} ${width - r} ${height} H ${r} Q 0 ${height} 0 ${height - r} V ${r} Q 0 0 ${r} 0 Z`,
    { x, y: top, color: fill, borderColor: PAPER.rule, borderWidth: 0.5 }
  );
  page.drawRectangle({
    x: x + 2,
    y: top - height + 5,
    width: 3,
    height: height - 10,
    color: accent,
  });
}

export function rule(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  dashed = false
) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 0.5,
    color: PAPER.divider,
    dashArray: dashed ? [3, 3] : undefined,
  });
}

export function sectionTitle(
  page: PDFPage,
  font: PDFFont,
  title: string,
  top: number
) {
  page.drawRectangle({
    x: LEFT,
    y: top - 13,
    width: 3,
    height: 12,
    color: PAPER.teal,
  });
  inkText(page, font, title, LEFT + 9, top - 11, 11);
  return top - 19;
}

const HEADER_INSET = 12;
const HEADER_LINE = 15;
export function headerLines({ wrap }: PdfText, title: string) {
  const lines = wrap(title, WIDTH - HEADER_INSET * 2, 11);
  // A repeated masthead must leave a useful body for an intact row or plot.
  if (lines.length * HEADER_LINE > 240)
    throw new Error(
      '見出しがページに収まりません。チーム名の長さを確認してください'
    );
  return lines;
}

export function drawPageHeader(page: PDFPage, font: PDFFont, lines: string[]) {
  const height = 12 + HEADER_LINE * lines.length;
  card(page, LEFT, TOP, WIDTH, height, PAPER.cream, PAPER.teal);
  lines.forEach((line, i) =>
    inkText(
      page,
      font,
      line,
      LEFT + HEADER_INSET,
      TOP - 17 - i * HEADER_LINE,
      11
    )
  );
  return TOP - height - 10;
}

export function drawFooter(page: PDFPage, font: PDFFont, caption: string) {
  rule(page, LEFT, 29, WIDTH, true);
  inkText(page, font, caption, LEFT, 16);
}

export function drawPageNumber(page: PDFPage, font: PDFFont, number: string) {
  inkText(
    page,
    font,
    number,
    LEFT + WIDTH - font.widthOfTextAtSize(number, TABLE_SIZE),
    16
  );
}

interface RowStyle {
  header?: boolean;
  stripe?: boolean;
  divider?: boolean;
  numeric?: readonly boolean[];
  groups?: readonly number[];
}

// Measure once, then place the complete row on either this page or the next.
export function measureRow(
  { font, wrap }: PdfText,
  cells: string[],
  widths: number[],
  style: RowStyle = {}
) {
  const lines = cells.map((cell, i) => wrap(cell, widths[i] - 6, TABLE_SIZE));
  const height = Math.max(...lines.map((cell) => cell.length)) * 11 + 8;
  const width = widths.reduce((sum, w) => sum + w, 0);
  return {
    height,
    draw(page: PDFPage, top: number) {
      if (top - height < BOTTOM)
        throw new Error(
          '表の1行がページに収まりません。氏名・IDや項目の長さを確認してください'
        );
      const fill = style.header
        ? PAPER.mist
        : style.stripe
          ? PAPER.stripe
          : undefined;
      if (fill)
        page.drawRectangle({
          x: LEFT,
          y: top - height,
          width,
          height,
          color: fill,
        });
      rule(page, LEFT, top - height, width);
      if (style.divider) {
        page.drawLine({
          start: { x: LEFT, y: top },
          end: { x: LEFT + width, y: top },
          thickness: 1.1,
          color: PAPER.ink,
        });
      }
      let x = LEFT;
      lines.forEach((cell, i) => {
        if (style.groups?.includes(i)) {
          page.drawLine({
            start: { x, y: top },
            end: { x, y: top - height },
            thickness: 0.65,
            color: PAPER.divider,
          });
        }
        cell.forEach((line, j) =>
          inkText(
            page,
            font,
            line,
            style.numeric?.[i]
              ? x + widths[i] - 3 - font.widthOfTextAtSize(line, TABLE_SIZE)
              : x + 3,
            top - 10 - j * 11
          )
        );
        x += widths[i];
      });
      return top - height;
    },
  };
}
