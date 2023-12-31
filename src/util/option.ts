import { Result } from "./result";

export class Option<T> {
  constructor(
    private state: { ok: true, value: T } | { ok: false }
  ) {}

  static fromNullable<T>(value: T | null | undefined): Option<T> {
    if (value === null || value === undefined) return Option.none();
    return Option.some(value);
  }

  static fromNoneToken<NT, T>(token: NT, value: NT | T): Option<Exclude<T, NT>> {
    if (value === token) return Option.none();
    return Option.some(value as Exclude<T, NT>);
  }

  static if<T>(condition: boolean, value: T): Option<T> {
    if (condition) return Option.some(value);
    return Option.none();
  }

  static some<T>(value: T) {
    return new Option<T>({ ok: true, value });
  }

  static none() {
    return new Option<never>({ ok: false });
  }

  isSome(): T extends never ? false : boolean { return this.state.ok as any; }
  isNone(): T extends never ? true : boolean { return !this.state.ok as any; }

  ifNone(fn: () => void): this {
    if (!this.state.ok)
      fn();

    return this;
  }

  unwrap(): T {
    if (this.state.ok) return this.state.value;
    throw new Error("called `Option.unwrap()` on a `None` value");
  }

  expect(err: string): T {
    if (this.state.ok) return this.state.value;
    throw new Error(err);
  }

  unwrapOr(or: T): T {
    if (this.state.ok) return this.state.value;
    return or;
  }

  okOr<E>(or: E): Result<T, E> {
    if (this.state.ok) return Result.ok(this.state.value);
    return Result.err(or);
  }

  map<T2>(fn: (value: T) => T2): Option<T2> {
    if (this.state.ok) return Option.some(fn(this.state.value));
    return Option.none();
  }

  filter(fn: (value: T) => boolean): Option<T> {
    if (this.state.ok && fn(this.state.value)) return this;
    return Option.none();
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, inspectOptions: any, inspect: (value: any, options: any) => string): string {
    return this.state.ok
      ? "Option::Some(" + inspect(this.state.value, inspectOptions) + ")"
      : "Option::None()";
  }
}