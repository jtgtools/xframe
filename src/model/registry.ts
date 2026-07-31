import { XFrameError } from "../errors/xframe-error.js";
import type { EntityId } from "./identifier.js";

export interface IdentifiedRecord {
  readonly id: EntityId;
}

export class Registry<T extends IdentifiedRecord> {
  readonly #entityType: string;
  #entries: Map<EntityId, T>;

  public constructor(entityType: string, entries?: ReadonlyMap<EntityId, T>) {
    this.#entityType = entityType;
    this.#entries = new Map(entries);
  }

  public get size(): number {
    return this.#entries.size;
  }

  public add(value: T): this {
    if (this.#entries.has(value.id)) {
      throw new XFrameError("DUPLICATE_IDENTIFIER", `Duplicate ${this.#entityType} identifier: ${value.id}.`, {
        kind: "duplicate-identifier",
        entityType: this.#entityType,
        id: value.id,
      });
    }
    this.#entries.set(value.id, value);
    return this;
  }

  public has(id: EntityId): boolean {
    return this.#entries.has(id);
  }

  public get(id: EntityId): T | undefined {
    return this.#entries.get(id);
  }

  public values(): readonly T[] {
    return Object.freeze([...this.#entries.values()]);
  }

  public entries(): readonly (readonly [EntityId, T])[] {
    return Object.freeze([...this.#entries.entries()].map(([id, value]) => Object.freeze([id, value] as const)));
  }

  public transaction(mutator: (draft: Registry<T>) => void): this {
    const draft = new Registry<T>(this.#entityType, this.#entries);
    mutator(draft);
    this.#entries = new Map(draft.#entries);
    return this;
  }

  public clone(): Registry<T> {
    return new Registry<T>(this.#entityType, this.#entries);
  }
}
