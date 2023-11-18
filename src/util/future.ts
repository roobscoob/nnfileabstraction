import { Option } from "./option";
import { Result } from "./result";

enum FutureState {
  Idle,
  Pending,
  Resolved,
  Rejected,
}

export class InvalidFutureState {
  constructor(
    public readonly currentState: FutureState,
    public readonly expectedState: FutureState,
  ) {}

  toString() {
    return `Invalid future state: expected ${FutureState[this.expectedState]} but got ${FutureState[this.currentState]}`;
  }
}

export class Future<sT, eT> {
  public static ok<sT>(value: sT): Future<sT, never> {
    const f = new Future<sT, never>;

    f.state = { state: FutureState.Resolved, value };

    return f;
  }

  public static err<eT>(value: eT): Future<never, eT> {
    const f = new Future<never, eT>;

    f.state = { state: FutureState.Rejected, value };

    return f;
  }

  public static fromPromise<sT, eT>(promise: Promise<Result<sT, eT>>): Future<sT, eT> {
    const f = new Future<sT, eT>;

    f.state = { state: FutureState.Pending, promise };

    return f;
  }

  public static fromAsyncResult<sT, eT>(getPromise: () => Promise<Result<sT, eT>>): Future<sT, eT> {
    const f = new Future<sT, eT>;

    f.state = {
      state: FutureState.Idle,
      trigger(resolve, reject) {
        getPromise().then(r => r.isOk() ? resolve(r.unwrap()) : reject(r.unwrapErr()));
      }
    };

    return f;
  }

  public static fromDefinedResult<sT, eT>(result: Result<sT, eT>): Future<sT, eT> {
    const f = new Future<sT, eT>;

    f.state = result.isOk() ? { state: FutureState.Resolved, value: result.unwrap() } : { state: FutureState.Rejected, value: result.unwrapErr() };

    return f;
  }

  public static of<sT, eT>(trigger: (resolve: (value: sT) => Result<void, InvalidFutureState>, reject: (value: eT) => Result<void, InvalidFutureState>) => void): Future<sT, eT> {
    const f = new Future<sT, eT>;

    f.state = { state: FutureState.Idle, trigger };

    return f;
  }

  public static promisify<Args extends [], sT, eT>(fn: (callback: (error: eT | null | undefined, success: sT) => void) => void): Future<sT, eT>
  public static promisify<Args extends [any], sT, eT>(fn: (arg_0: Args[0], callback: (error: eT | null | undefined, success: sT) => void) => void, arg_0: Args[0]): Future<sT, eT>
  public static promisify<Args extends [any, any], sT, eT>(fn: (arg_0: Args[0], arg_1: Args[1], callback: (error: eT | null | undefined, success: sT) => void) => void, arg_0: Args[0], arg_1: Args[1]): Future<sT, eT>
  public static promisify<Args extends [any, any, any], sT, eT>(fn: (arg_0: Args[0], arg_1: Args[1], arg_2: Args[2], callback: (error: eT | null | undefined, success: sT) => void) => void, arg_0: Args[0], arg_1: Args[1], arg_2: Args[2]): Future<sT, eT>
  public static promisify<Args extends [any, any, any, any], sT, eT>(fn: (arg_0: Args[0], arg_1: Args[1], arg_2: Args[2], arg_3: Args[3], callback: (error: eT | null | undefined, success: sT) => void) => void, arg_0: Args[0], arg_1: Args[1], arg_2: Args[2], arg_3: Args[3]): Future<sT, eT>
  public static promisify<Args extends [any, any, any, any, any], sT, eT>(fn: (arg_0: Args[0], arg_1: Args[1], arg_2: Args[2], arg_3: Args[3], arg_4: Args[4], callback: (error: eT | null | undefined, success: sT) => void) => void, arg_0: Args[0], arg_1: Args[1], arg_2: Args[2], arg_3: Args[3], arg_4: Args[4]): Future<sT, eT>
  public static promisify(fn: any, ...args: any[]): any {
    return Future.of((resolve, reject) => {
      fn(...args, (error: any, success: any) => {
        if (error != null)
          reject(error);
        else
          resolve(success);
      })
    })
  }

  private constructor() {}

  private state!: {
    state: FutureState.Idle,
    trigger: (resolve: (value: sT) => Result<void, InvalidFutureState>, reject: (value: eT) => Result<void, InvalidFutureState>) => void,
  } | {
    state: FutureState.Pending,
    promise: Promise<Result<sT, eT>>,
  } | {
    state: FutureState.Resolved,
    value: sT,
  } | {
    state: FutureState.Rejected,
    value: eT,
  }

  private resolve(value: sT): Result<void, InvalidFutureState> {
    if (this.state.state !== FutureState.Pending)
      return Result.err(new InvalidFutureState(this.state.state, FutureState.Pending));
  
    this.state = {
      state: FutureState.Resolved,
      value,
    };

    return Result.ok(undefined);
  }

  private reject(value: eT): Result<void, InvalidFutureState> {
    if (this.state.state !== FutureState.Pending)
      return Result.err(new InvalidFutureState(this.state.state, FutureState.Pending));
  
    this.state = {
      state: FutureState.Rejected,
      value,
    };

    return Result.ok(undefined);
  }

  invoke(): Promise<Result<sT, eT>> {
    if (this.state.state === FutureState.Resolved)
      return Promise.resolve(Result.ok(this.state.value));

    if (this.state.state === FutureState.Rejected)
      return Promise.resolve(Result.err(this.state.value));

    if (this.state.state === FutureState.Pending)
      return this.state.promise;

    const { trigger } = this.state;

    const promise = new Promise<Result<sT, eT>>(finish => {
      trigger(
        v => this.resolve(v).map(() => finish(Result.ok(v))),
        v => this.reject(v).map(() => finish(Result.err(v))),
      )
    });

    this.state = { state: FutureState.Pending, promise };

    return this.state.promise;
  }

  begin() {
    if (this.state.state === FutureState.Idle)
      this.invoke();

    return this;
  }
  
  then(onFulfilled: (value: Result<sT, eT>) => void, onRejected?: (value: never) => void): void {
    if (this.state.state === FutureState.Resolved)
      return onFulfilled(Result.ok(this.state.value));

    if (this.state.state === FutureState.Rejected)
      return onFulfilled(Result.err(this.state.value));

    this.invoke().then(onFulfilled);
  }

  isOk(): Promise<boolean> { return this.invoke().then(v => v.isOk()); }
  isErr(): Promise<boolean> { return this.invoke().then(v => v.isErr()); }

  ok(): Promise<Option<sT>> { return this.invoke().then(v => v.ok()); }
  err(): Promise<Option<eT>> { return this.invoke().then(v => v.err()); }

  unwrap(): Promise<sT> { return this.invoke().then(v => v.unwrap()); }
  expect(err: Error): Promise<sT> { return this.invoke().then(v => v.expect(err)); }
  unwrapErr(): Promise<eT> { return this.invoke().then(v => v.unwrapErr()); }

  map<sT2, eT2 = never>(fn: (value: sT) => Future<sT2, eT2> | Promise<sT2> | Result<sT2, eT2> | sT2): Future<sT2, eT | eT2> {
    if (this.state.state === FutureState.Resolved) {
      const mapped = fn(this.state.value);

      if (mapped instanceof Promise)
        return Future.fromPromise(mapped.then(Result.ok));
      else if (mapped instanceof Result)
        return Future.ok(mapped.unwrap());
      else if (mapped instanceof Future)
        return mapped;
      else
        return Future.ok(mapped);
    }

    if (this.state.state === FutureState.Rejected)
      return Future.err(this.state.value);

    return Future.of((resolve, reject) => {
      this.then(result => {
        if (result.isOk()) {
          const mapped = fn(result.unwrap())

          if (mapped instanceof Promise)
            mapped.then(resolve);
          else if (mapped instanceof Result)
            mapped.isOk() ? resolve(mapped.unwrap()) : reject(mapped.unwrapErr());
          else if (mapped instanceof Future)
            mapped.invoke().then(v => v.isOk() ? resolve(v.unwrap()) : reject(v.unwrapErr()));
          else
            resolve(mapped);
        }
        else
          reject(result.unwrapErr());
      });
    });
  }

  mapTry<sT2>(fn: (value: sT) => sT2): Future<sT2, any> {
    if (this.state.state === FutureState.Resolved) {
      try {
        return Future.ok(fn(this.state.value));
      } catch (e) {
        return Future.err(e);
      }
    }

    if (this.state.state === FutureState.Rejected)
      return Future.err(this.state.value);

    return Future.of((resolve, reject) => {
      this.then(result => {
        if (result.isErr())
          return reject(result.unwrapErr());

        try {
          resolve(fn(result.unwrap()));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  mapErr<eT2>(fn: (value: eT) => eT2): Future<sT, eT2> {
    if (this.state.state === FutureState.Resolved)
      return Future.ok(this.state.value);

    if (this.state.state === FutureState.Rejected)
      return Future.err(fn(this.state.value));

    return Future.of((resolve, reject) => {
      this.then(result => {
        if (result.isOk())
          resolve(result.unwrap());
        else
          reject(fn(result.unwrapErr()));
      });
    });
  }

  use(fn: (value: sT) => void): Future<sT, eT> {
    if (this.state.state === FutureState.Resolved) {
      fn(this.state.value);
      return this;
    }

    if (this.state.state === FutureState.Rejected)
      return this;

    this.then(result => result.isOk() && fn(result.unwrap()));

    return this;
  }

  useErr(fn: (value: eT) => void): Future<sT, eT> {
    if (this.state.state === FutureState.Resolved)
      return this;

    if (this.state.state === FutureState.Rejected) {
      fn(this.state.value);
      return this;
    }

    this.then(result => result.isErr() && fn(result.unwrapErr()));

    return this;
  }
  
  zip(): Future<[sT], eT>
  zip<sT2, eT2>(g0: ((v: sT) => Future<sT2, eT2>)): Future<[sT, sT2], eT | eT2>
  zip<sT2, eT2, sT3, eT3>(g0: ((v: sT) => Future<sT2, eT2>), g1: ((v: sT) => Future<sT3, eT3>)): Future<[sT, sT2, sT3], eT | eT2 | eT3>
  zip<sT2, eT2, sT3, eT3, sT4, eT4>(g0: ((v: sT) => Future<sT2, eT2>), g1: ((v: sT) => Future<sT3, eT3>), g2: ((v: sT) => Future<sT4, eT4>)): Future<[sT, sT2, sT3, sT4], eT | eT2 | eT3 | eT4>
  zip<sT2, eT2, sT3, eT3, sT4, eT4, sT5, eT5>(g0: ((v: sT) => Future<sT2, eT2>), g1: ((v: sT) => Future<sT3, eT3>), g2: ((v: sT) => Future<sT4, eT4>), g3: ((v: sT) => Future<sT5, eT5>)): Future<[sT, sT2, sT3, sT4, sT5], eT | eT2 | eT3 | eT4 | eT5>
  zip<sT2, eT2, sT3, eT3, sT4, eT4, sT5, eT5, sT6, eT6>(g0: ((v: sT) => Future<sT2, eT2>), g1: ((v: sT) => Future<sT3, eT3>), g2: ((v: sT) => Future<sT4, eT4>), g3: ((v: sT) => Future<sT5, eT5>), g4: ((v: sT) => Future<sT6, eT6>)): Future<[sT, sT2, sT3, sT4, sT5, sT6], eT | eT2 | eT3 | eT4 | eT5 | eT6>
  zip(...getValues: ((v: sT) => Future<any, any>)[]): Future<any[], any> {
    if (this.state.state === FutureState.Rejected)
      return Future.err(this.state.value);

    if (this.state.state === FutureState.Resolved) {
      const futures = getValues.map(fn => fn((this.state as any).value));

      if (futures.length === 0)
        return Future.ok([this.state.value] as any);

      if (futures.every(f => f.state.state === FutureState.Resolved))
        return Future.ok([this.state.value, ...futures.map(f => (f.state as any).value)] as any);

      return Future.fromAsyncResult(async () => {
        const values = await Promise.all(futures);

        if (values.some(v => v.isErr()))
          return Future.err(values.find(v => v.isErr())!.unwrapErr());

        return Result.ok([(this.state as any).value, ...values.map(v => v.unwrap())] as any);
      });
    }

    return Future.of((resolve, reject) => {
      this.then(result => {
        if (result.isErr())
          return reject(result.unwrapErr());

        const futures = getValues.map(fn => fn(result.unwrap()));

        if (futures.length === 0)
          return resolve([result.unwrap()] as any);

        if (futures.every(f => f.state.state === FutureState.Resolved))
          return resolve([result.unwrap(), ...futures.map(f => (f.state as any).value)] as any);

        Promise.all(futures).then(values => {
          if (values.some(v => v.isErr()))
            return reject(values.find(v => v.isErr())!.unwrapErr());

          resolve([result.unwrap(), ...values.map(v => v.unwrap())] as any);
        });
      });
    });
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, inspectOptions: any, inspect: (value: any, options: any) => string): string {
    switch (this.state.state) {
      case FutureState.Idle:
        return "Future::Idle(...)";
      case FutureState.Pending:
        return "Future::Pending(...)";
      case FutureState.Resolved:
        return "Future::Resolved(" + inspect(this.state.value, inspectOptions) + ")";
      case FutureState.Rejected:
        return "Future::Rejected(" + inspect(this.state.value, inspectOptions) + ")";
    }
  }
}