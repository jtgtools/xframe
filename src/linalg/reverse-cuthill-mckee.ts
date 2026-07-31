import type { Adjacency } from "./adjacency.js";

export interface MatrixOrdering {
  readonly permutation: readonly number[];
  readonly inversePermutation: readonly number[];
}

function ordering(permutation: readonly number[]): MatrixOrdering {
  const inverse = new Array<number>(permutation.length);
  for (let newIndex = 0; newIndex < permutation.length; newIndex += 1) inverse[permutation[newIndex]!] = newIndex;
  return Object.freeze({
    permutation: Object.freeze([...permutation]),
    inversePermutation: Object.freeze(inverse),
  });
}

export function identityOrdering(size: number): MatrixOrdering {
  return ordering(Array.from({ length: size }, (_, index) => index));
}

export function reverseCuthillMcKee(adjacency: Adjacency): MatrixOrdering {
  const size = adjacency.length;
  const visited = new Uint8Array(size);
  const permutation: number[] = [];

  while (permutation.length < size) {
    let start = -1;
    for (let index = 0; index < size; index += 1) {
      if (visited[index] !== 0) continue;
      if (start < 0 || adjacency[index]!.length < adjacency[start]!.length || (adjacency[index]!.length === adjacency[start]!.length && index < start)) start = index;
    }

    const component: number[] = [];
    const queue = [start];
    visited[start] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head]!;
      component.push(node);
      const next = adjacency[node]!
        .filter((neighbor) => visited[neighbor] === 0)
        .sort((left, right) => adjacency[left]!.length - adjacency[right]!.length || left - right);
      for (const neighbor of next) {
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    component.reverse();
    permutation.push(...component);
  }

  return ordering(permutation);
}
