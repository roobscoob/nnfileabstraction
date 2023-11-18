import { Future } from "./future";
import { Option } from "./option";
import { Result } from "./result";

export class AsyncIterator<T> {
  static over<T>(t: AsyncIterable<T> | Iterable<T>): AsyncIterator<T> {
    const iterator = Symbol.asyncIterator in t ? t[Symbol.asyncIterator]() : t[Symbol.iterator]();

    return new AsyncIterator(async () => {
      const next = await iterator.next();

      if (next.done)
        return Option.none();

      return Option.some(next.value);
    });
  }

  static range(start: number, end: number, step: number = 1) {
    return new AsyncIterator<number>(async () => {
      if (start > end)
        return Option.none();

      const value = start;
      start += step;
      return Option.some(value);
    });
  }

  static rangeInclusive(start: number, end: number, step: number = 1) {
    return new AsyncIterator<number>(async () => {
      if (start > end)
        return Option.none();

      const value = start;
      start += step;
      
      if (start > end)
        start = end + 1;

      return Option.some(value);
    });
  }

  static zipStrict<T extends any[]>(...iterators: { [K in keyof T]: AsyncIterator<T[K]> }) {
    return new AsyncIterator(async () => {
      const values = await Promise.all(iterators.map(iterator => iterator.next()));

      if (values.some(v => v.isNone()))
        return Option.none();

      return Option.some(<T> values.map(value => value.unwrap()));
    });
  }

  static zipLossy<T extends any[]>(...iterators: { [K in keyof T]: AsyncIterator<T[K]> }) {
    return new AsyncIterator(async () => {
      const values = await Promise.all(iterators.map(iterator => iterator.next()));

      if (values.every(v => v.isNone()))
        return Option.none();

      return Option.some(<{ [K in keyof T]: Option<T[K]> }> values);
    });
  }

  constructor(private readonly nextFn: () => Promise<Option<T>>) {}

  async *[Symbol.asyncIterator]() {
    let next = await this.next();

    while (next.isSome()) {
      yield next.unwrap();
      next = await this.next();
    }
  }

  async next(): Promise<Option<T>> {
    return this.nextFn();
  }

  map<U>(fn: (value: T) => Promise<U> | U): AsyncIterator<Awaited<U>> {
    return new AsyncIterator(async () => {
      const next = await this.next();

      if (next.isNone())
        return Option.none();

      return Option.some(await fn(next.unwrap()));
    });
  }

  filter(fn: (value: T) => Promise<boolean> | boolean): AsyncIterator<T> {
    return new AsyncIterator(async () => {
      let next = await this.next();

      while (next.isSome() && !await fn(next.unwrap()))
        next = await this.next();

      return next;
    });
  }

  collectFuture<T2, E>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Future<T2, E>): Future<T2 | undefined, E>
  collectFuture<T2, E>(fn: (current: T, sum: T2, terminate: () => void) => Future<T2, E>, initializer: T2): Future<T2, E>
  collectFuture<T2, E>(fn: (current: T, sum: T2 | undefined, terminate: () => void) => Future<T2, E>, initializer?: T2): Future<T2 | undefined, E> {
    return Future.fromAsyncResult(async () => {
      let sum: T2 | undefined = initializer;
      let terminated = false;

      for await (const current of this) {
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

  async find(fn: (value: T) => Promise<boolean> | boolean): Promise<Option<T>> {
    for await (const value of this) {
      if (await fn(value))
        return Option.some(value);
    }

    return Option.none();
  }

  zip<T2>(fn: (value: T) => Promise<T2> | T2): AsyncIterator<[T, T2]> {
    return new AsyncIterator(async () => {
      const next = await this.next();

      if (next.isNone())
        return Option.none();

      return Option.some([next.unwrap(), await fn(next.unwrap())]);
    });
  }

  async forEach(fn: (value: T) => Promise<void> | void): Promise<void> {
    for await (const value of this)
      await fn(value);
  }
}