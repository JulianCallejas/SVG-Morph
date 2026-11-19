import { describe, expect, it } from 'vitest';
import { stackContours } from './contourStacking';

const box = (id: string, width: number, height: number) => ({ id, bbox: { x: 0, y: 0, width, height } });

describe('stackContours', () => {
  const big = box('big', 100, 100);
  const medium = box('medium', 40, 40);
  const small = box('small', 5, 5);

  it('draws the largest first so the smaller ones end up on top', () => {
    expect(stackContours([small, big, medium]).map((c) => c.id)).toEqual(['big', 'medium', 'small']);
  });

  it('keeps the original order between contours of the same size', () => {
    const a = box('a', 10, 10);
    const b = box('b', 10, 10);
    const c = box('c', 10, 10);

    expect(stackContours([b, c, a]).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('puts a raised contour on top of everything, whatever its size', () => {
    expect(stackContours([small, big, medium], ['big']).map((c) => c.id)).toEqual(['medium', 'small', 'big']);
  });

  it('puts several raised contours on top in the order given, the last one highest', () => {
    expect(stackContours([small, big, medium], ['big', 'medium']).map((c) => c.id)).toEqual([
      'small',
      'big',
      'medium',
    ]);
  });

  it('ignores raised ids that are empty or not in the list', () => {
    expect(stackContours([small, big], [null, undefined, 'nope']).map((c) => c.id)).toEqual(['big', 'small']);
  });

  it('does not change the list it is given', () => {
    const list = [small, big, medium];
    stackContours(list, ['big']);

    expect(list.map((c) => c.id)).toEqual(['small', 'big', 'medium']);
  });
});
