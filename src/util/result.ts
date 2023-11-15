import { Option } from "./option";

export class Result<sT, eT> {
  static ok<sT>(value: sT) {
    return new Result<sT, never>({ ok: true, value });
  }

  static err<eT>(value: eT) {
    return new Result<never, eT>({ ok: false, value });
  }

  static try<sT>(fn: () => sT): Result<sT, any> {
    try {
      return Result.ok(fn());
    } catch (e) {
      return Result.err(e);
    }
  }

  static bindTry<sT, Args extends any[]>(fn: (...args: Args) => sT): (...args: Args) => Result<sT, any> {
    return (...args: Args) => Result.try(() => fn(...args));
  }

  private constructor(
    private state: { ok: true, value: sT } | { ok: false, value: eT }
  ) {}

  isOk(): sT extends never ? false : eT extends never ? true : boolean { return this.state.ok as any; }
  isErr(): eT extends never ? false : sT extends never ? true : boolean { return !this.state.ok as any; }

  ok(): sT extends never ? Option<never> : Option<sT> { return (this.state.ok ? Option.some(this.state.value) : Option.none()) as any; }
  err(): eT extends never ? Option<never> : Option<eT> { return (this.state.ok ? Option.none() : Option.some(this.state.value)) as any; }

  unwrap(): sT {
    if (this.state.ok) return this.state.value;
    throw this.state.value;
  }

  expect(err: string) {
    if (this.state.ok) return this.state.value;
    throw new Error(err);
  }

  unwrapErr(): eT {
    if (this.state.ok) throw this.state.value;
    return this.state.value;
  }

  map<sT2, eT2>(fn: (value: sT) => sT2 | Result<sT2, eT2>): Result<sT2, eT | eT2> {
    if (!this.state.ok)
      return Result.err(this.state.value);
  
    const mapped = fn(this.state.value);
  
    if (mapped instanceof Result)
      return mapped;

    return Result.ok(mapped);
  }

  mapTry<sT2>(fn: (value: sT) => sT2): Result<sT2, any> {
    if (!this.state.ok)
      return Result.err(this.state.value);

    try {
      return Result.ok(fn(this.state.value));
    } catch (e) {
      return Result.err(e);
    }
  }

  mapErr<eT2>(fn: (value: eT) => eT2): Result<sT, eT2> {
    if (this.state.ok) return Result.ok(this.state.value);
    return Result.err(fn(this.state.value));
  }
}