import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRef,
} from 'pdf-lib';
import { addOutline, linkToPage } from './PdfNavigation';

const build = async () => {
  const pdf = await PDFDocument.create();
  const pages = [pdf.addPage(), pdf.addPage(), pdf.addPage(), pdf.addPage()];
  return { pdf, pages };
};

const reload = async (pdf: PDFDocument) => PDFDocument.load(await pdf.save());
const indexOf = (doc: PDFDocument, dest: PDFArray) =>
  doc.getPages().findIndex((page) => page.ref === (dest.get(0) as PDFRef));

test('adds a clickable area that jumps to the target page', async () => {
  const { pdf, pages } = await build();
  linkToPage(pdf, pages[0], { x: 10, y: 20, width: 100, height: 12 }, pages[3]);
  const doc = await reload(pdf);
  const annots = doc.getPage(0).node.Annots()!;
  expect(annots.size()).toBe(1);
  const link = annots.lookup(0, PDFDict);
  expect(link.get(PDFName.of('Subtype'))).toBe(PDFName.of('Link'));
  const rect = link.lookup(PDFName.of('Rect'), PDFArray);
  expect(
    rect
      .asArray()
      .map((n) => Number((n as never as { asNumber(): number }).asNumber()))
  ).toEqual([10, 20, 110, 32]);
  expect(indexOf(doc, link.lookup(PDFName.of('Dest'), PDFArray))).toBe(3);
  // no visible frame around the clickable text
  expect(
    link
      .lookup(PDFName.of('Border'), PDFArray)
      .asArray()
      .map((n) => (n as never as { asNumber(): number }).asNumber())
  ).toEqual([0, 0, 0]);
});

test('builds nested bookmarks whose destinations are the chosen pages', async () => {
  const { pdf, pages } = await build();
  addOutline(pdf, [
    {
      title: '公式戦',
      page: pages[1],
      children: [
        { title: '成績表', page: pages[1] },
        { title: '背番号1 選手', page: pages[3] },
      ],
    },
    { title: '練習試合', page: pages[2] },
  ]);
  const doc = await reload(pdf);
  const outlines = doc.catalog.lookup(PDFName.of('Outlines'), PDFDict);
  expect(outlines.get(PDFName.of('Count'))?.toString()).toBe('4');
  const title = (item: PDFDict) =>
    (item.lookup(PDFName.of('Title')) as PDFHexString).decodeText();
  const first = outlines.lookup(PDFName.of('First'), PDFDict);
  expect(title(first)).toBe('公式戦');
  expect(indexOf(doc, first.lookup(PDFName.of('Dest'), PDFArray))).toBe(1);
  const child = first.lookup(PDFName.of('First'), PDFDict);
  const lastChild = first.lookup(PDFName.of('Last'), PDFDict);
  expect([title(child), title(lastChild)]).toEqual(['成績表', '背番号1 選手']);
  expect(indexOf(doc, lastChild.lookup(PDFName.of('Dest'), PDFArray))).toBe(3);
  expect(child.lookup(PDFName.of('Next'), PDFDict)).toBe(lastChild);
  expect(lastChild.lookup(PDFName.of('Parent'), PDFDict)).toBe(first);
  const second = first.lookup(PDFName.of('Next'), PDFDict);
  expect(title(second)).toBe('練習試合');
  expect(outlines.lookup(PDFName.of('Last'), PDFDict)).toBe(second);
});

test('adds no outline for an empty list', async () => {
  const { pdf } = await build();
  addOutline(pdf, []);
  const doc = await reload(pdf);
  expect(doc.catalog.get(PDFName.of('Outlines'))).toBeUndefined();
});
