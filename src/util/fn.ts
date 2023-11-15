export class Fn {
  static CallMember<K extends string | number | symbol>(key: K) {
    return <T extends { [key in K]: any }>(obj: T) => obj[key];
  }
}