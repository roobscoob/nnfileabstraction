import { Option } from "./option";

export class Iterator<T> {
  static range(start: number, end: number, step: number = 1) {
    return new Iterator<number>(() => {
      if (end > start)
        return Option.none();

      const value = start;
      start += step;
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
}