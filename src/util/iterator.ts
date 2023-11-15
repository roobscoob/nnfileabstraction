import { Future } from "./future";
import { Option } from "./option";
import { Result } from "./result";

export class Iterator<T> {
  static over<T>(t: Iterable<T>): Iterator<T> {
    return new Iterator(() => {
      const next = t[Symbol.iterator]().next();

      if (next.done)
        return Option.none();

      return Option.some(next.value);
    });
  }

  static range(start: number, end: number, step: number = 1) {
    return new Iterator<number>(() => {
      if (start > end)
        return Option.none();

      const value = start;
      start += step;
      return Option.some(value);
    });
  }

  static rangeInclusive(start: number, end: number, step: number = 1) {
    return new Iterator<number>(() => {
      if (start > end)
        return Option.none();

      const value = start;
      start += step;
      
      if (start > end)
        start = end + 1;

      return Option.some(value);
    });
  }

  static zipStrict<T extends any[]>(...iterators: { [K in keyof T]: Iterator<T[K]> }) {
    return new Iterator<T>(() => {
      const values = iterators.map(iterator => iterator.next());

      if (values.some(v => v.isNone()))
        return Option.none();

      return Option.some(<T> values.map(value => value.unwrap()));
    });
  }

  static zipLossy<T extends any[]>(...iterators: { [K in keyof T]: Iterator<T[K]> }) {
    return new Iterator(() => {
      const values = iterators.map(iterator => iterator.next());

      if (values.every(v => v.isNone()))
        return Option.none();

      return Option.some(<{ [K in keyof T]: Option<T[K]> }> values);
    });
  }

  constructor(private nextFn: () => Option<T>) {}

  *[Symbol.iterator]() {
    let next = this.nextFn();
    while (next.isSome()) {
      yield next.unwrap();
      next = this.nextFn();
    } 
  }

  next() {
    return this.nextFn();
  }

  map<T2>(fn: (value: T) => T2): Iterator<T2> {
    return new Iterator<T2>(() => this.next().map(fn));
  }

  filter(fn: (value: T) => boolean): Iterator<T> {
    return new Iterator<T>(() => this.next().filter(fn));
  }

  collect<T2>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => T2): T2 | undefined
  collect<T2>(fn: (current: T, sum: T2, terminate: () => void) => T2, initializer: T2): T2
  collect<T2>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => T2, initializer?: T2): T2 | undefined {
    let sum = initializer;
    let terminated = false;

    for (const current of this) {
      sum = fn(current, sum, () => terminated = true);

      if (terminated)
        break;
    }

    return sum;
  }

  collectOption<T2>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Option<T2>): T2 | undefined
  collectOption<T2>(fn: (current: T, sum: T2, terminate: () => void) => Option<T2>, initializer: T2): T2 | undefined
  collectOption<T2>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Option<T2>, initializer?: T2): T2 | undefined {
    let sum: T2 | undefined = undefined;
    let terminated = false;

    for (const current of this) {
      const result = fn(current, sum, () => terminated = true);

      if (result.isSome())
        sum = result.unwrap();
    }

    return sum;
  }

  collectResult<T2, E>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Result<T2, E>): Result<T2 | undefined, E>
  collectResult<T2, E>(fn: (current: T, sum: T2, terminate: () => void) => Result<T2, E>, initializer: T2): Result<T2, E>
  collectResult<T2, E>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Result<T2, E>, initializer?: T2): Result<T2 | undefined, E> {
    let sum: T2 | undefined = undefined;
    let terminated = false;

    for (const current of this) {
      const result = fn(current, sum, () => terminated = true);

      if (result.isErr())
        return result;

      sum = result.unwrap();

      if (terminated)
        break;
    }

    return Result.ok(sum);
  }

  collectFuture<T2, E>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Future<T2, E>): Future<T2 | undefined, E>
  collectFuture<T2, E>(fn: (current: T, sum: T2, terminate: () => void) => Future<T2, E>, initializer: T2): Future<T2, E>
  collectFuture<T2, E>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Future<T2, E>, initializer?: T2): Future<T2 | undefined, E> {
    return Future.fromAsyncResult(async () => {
      let sum: T2 | undefined = initializer;
      let terminated = false;

      for (const current of this) {
        const result = await fn(current, sum, () => terminated = true).invoke();

        if (result.isErr())
          return result;

        sum = result.unwrap();

        if (terminated)
          break;
      }

      return Result.ok(sum);
    });
  }
}