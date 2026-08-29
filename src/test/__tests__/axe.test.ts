import { axe } from '../axe';

describe('axe helper', () => {
  test('DOM要素に対してアクセシビリティ検証を実行できる', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<main role="main"><h1>Title</h1></main>';
    const results = await axe(el);
    expect(results).toHaveNoViolations();
  });
});
