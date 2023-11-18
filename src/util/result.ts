import { Future } from "./future";
import { Option } from "./option";

export class UnwrapFailedError<eT> extends Error {
  constructor(error: eT) {
    super("Unwrap failed: Result was Err(" + error + ")");
  }
}

export class UnwrapErrFailedError<sT> extends Error {
  constructor(value: sT) {
    super("UnwrapErr failed: Result was Ok(" + value + ")");
  }
}

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

  isOk(): this is Result<sT, never> { return this.state.ok as any; }
  isErr(): this is Result<never, eT> { return !this.state.ok as any; }

  ok(): sT extends never ? Option<never> : Option<sT> { return (this.state.ok ? Option.some(this.state.value) : Option.none()) as any; }
  err(): eT extends never ? Option<never> : Option<eT> { return (this.state.ok ? Option.none() : Option.some(this.state.value)) as any; }

  unwrap(): sT {
    if (this.state.ok) return this.state.value;
    throw new UnwrapFailedError(this.state.value);
  }

  expect(err: Error) {
    if (this.state.ok) return this.state.value;
    throw err;
  }

  unwrapErr(): eT {
    if (this.state.ok) throw new UnwrapErrFailedError(this.state.value);
    return this.state.value;
  }

  map<sT2, eT2 = never>(fn: (value: sT) => sT2 | Result<sT2, eT2>): Result<sT2, eT | eT2> {
    if (!this.state.ok)
      return Result.err(this.state.value);
  
    const mapped = fn(this.state.value);
  
    if (mapped instanceof Result)
      return mapped;

    return Result.ok(mapped);
  }

  mapAsync<sT2, eT2>(fn: (value: sT) => Future<sT2, eT2> | Promise<Result<sT2, eT2>>): Future<sT2, eT | eT2> {
    if (this.isErr())
      return Future.err(this.unwrapErr());

    const mapped = fn(this.unwrap());

    if (mapped instanceof Future)
      return mapped;

    return Future.fromPromise(mapped);
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

  use(fn: (value: sT) => void): this {
    if (this.state.ok)
      fn(this.state.value);

    return this;
  }

  useErr(fn: (value: eT) => void): this {
    if (!this.state.ok)
      fn(this.state.value);

    return this;
  }

  zip<sT2, eT2 = never>(other: (v: sT) => Result<sT2, eT2> | sT2): Result<[sT, sT2], eT | eT2> {
    if (this.isErr())
      return Result.err(this.unwrapErr());
  
    const otherRes = other(this.unwrap());

    if (!(otherRes instanceof Result))
      return Result.ok([this.unwrap(), otherRes]);

    if (otherRes.isErr())
      return Result.err(otherRes.unwrapErr());

    return Result.ok([this.unwrap(), otherRes.unwrap()]);
  }

  async() {
    return Future.fromDefinedResult(this);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, inspectOptions: any, inspect: (value: any, options: any) => string): string {
    return this.state.ok
      ? "Result::Ok(" + inspect(this.state.value, inspectOptions) + ")"
      : "Result::Err(" + inspect(this.state.value, inspectOptions) + ")";
  }
}