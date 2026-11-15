import { PDFDocument, PDFHexString, PDFName, PDFPage, PDFRef } from 'pdf-lib';

export interface LinkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OutlineNode {
  title: string;
  page: PDFPage;
  children?: readonly OutlineNode[];
}

// An invisible clickable area on `from` that jumps to the whole `to` page.
export const linkToPage = (
  pdf: PDFDocument,
  from: PDFPage,
  { x, y, width, height }: LinkArea,
  to: PDFPage
): void => {
  const link = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      Dest: [to.ref, 'Fit'],
    })
  );
  from.node.addAnnot(link);
};

// Bookmarks (the viewer's outline panel); every node is open.
export const addOutline = (
  pdf: PDFDocument,
  nodes: readonly OutlineNode[]
): void => {
  if (!nodes.length) return;
  const { context } = pdf;
  const rootRef = context.nextRef();

  const build = (items: readonly OutlineNode[], parent: PDFRef) => {
    const refs = items.map(() => context.nextRef());
    let total = 0;
    items.forEach((item, i) => {
      const inner = item.children?.length
        ? build(item.children, refs[i])
        : null;
      total += 1 + (inner?.total ?? 0);
      context.assign(
        refs[i],
        context.obj({
          Title: PDFHexString.fromText(item.title),
          Parent: parent,
          Dest: [item.page.ref, 'Fit'],
          ...(i > 0 && { Prev: refs[i - 1] }),
          ...(i < items.length - 1 && { Next: refs[i + 1] }),
          ...(inner && {
            First: inner.first,
            Last: inner.last,
            Count: inner.total,
          }),
        })
      );
    });
    return { first: refs[0], last: refs[refs.length - 1], total };
  };

  const root = build(nodes, rootRef);
  context.assign(
    rootRef,
    context.obj({
      Type: 'Outlines',
      First: root.first,
      Last: root.last,
      Count: root.total,
    })
  );
  pdf.catalog.set(PDFName.of('Outlines'), rootRef);
  pdf.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
};
