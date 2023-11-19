import { Endianness } from "../enums";
import { ReadOutOfBoundsError, ReadableSpan, WritableSpan, WriteOutOfBoundsError } from "../span";
import { Future } from "../util/future";
import { Result } from "../util/result";
import { CorruptedStruct as CorruptedStructError } from "./errors";
import { StructType } from "./type";

export class Struct {
  static Field<const KeyName, const DataType, const DataReadError>(name: KeyName, type: StructType<DataType, DataReadError>, forcedEndianness?: Endianness): StructType<{ key: KeyName, value: DataType }, DataReadError> {
    return new class NameBoundField extends StructType<{ key: KeyName, value: DataType }, DataReadError> {
      read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness): Future<{ value: { key: KeyName, value: DataType }; bytesRead: number; }, DataReadError | RE | ReadOutOfBoundsError> {
        return type
          .read(offset, span, forcedEndianness ?? endianness)
          .map(({ value, bytesRead }) => ({ value: { key: name, value }, bytesRead }));
      }

      write<WE>(offset: number, value: { key: KeyName; value: DataType; }, span: WritableSpan<any, any, WE>, endianness: Endianness): Future<void, WE | WriteOutOfBoundsError> {
        return type.write(offset, value.value, span, forcedEndianness ?? endianness);
      }
    }
  }

  static Padding(size: number) {
    return <StructType<undefined, never>> new class Padding extends StructType<undefined, never> {
      read<RE>(offset: number, span: ReadableSpan<RE>): Future<{ value: undefined; bytesRead: number; }, RE> {
        return Future.ok({ value: undefined, bytesRead: size });
      }

      write<WE>(offset: number, value: undefined, span: WritableSpan<any, any, WE>): Future<void, WE> {
        return Future.ok(undefined);
      }
    }
  }

  static Definition<const Types extends (StructType<undefined, never> | StructType<{ key: string, value: any }, any>)[] | readonly (StructType<undefined, never> | StructType<{ key: string, value: any }, any>)[]>(name: string, types: Types) {
    return class Definition {
      static deserialize<RE>(span: ReadableSpan<RE>, endianness: Endianness, offset = 0): Future<Definition, GetReadErrors<RemovePadding<Types>> | RE | ReadOutOfBoundsError> {
        return Future.fromAsyncResult(async () => {
          const data = {} as any;

          for (const type of types) {
            const v = await type.read(offset, span, endianness);

            if (v.isErr())
              return v;

            const value = v.unwrap();
            offset += value.bytesRead;

            if (value.value == undefined)
              continue;

            data[value.value.key] = value.value.value;
          }

          return Result.ok(new this(data as any));
        })
      }

      constructor(readonly value: ToPojo<RemovePadding<Types>>) {}

      assertField<Field extends keyof ToPojo<RemovePadding<Types>>>(fieldName: Field, value: ToPojo<RemovePadding<Types>>[Field]): <T>(d: T) => Result<T, CorruptedStructError<ToPojo<RemovePadding<Types>>[Field]>> {
        if (this.value[fieldName] !== value)
          return <T>(d: T) => Result.ok(d);
        else
          return <T>(d: T) => Result.err(new CorruptedStructError(fieldName, name, value, this.value[fieldName]))
      }
    }
  }
}

type RemovePadding<T extends (StructType<undefined, never> | StructType<{ key: string, value: any }, any>)[] | readonly (StructType<undefined, never> | StructType<{ key: string, value: any }, any>)[]> =
  T extends [infer Head, ...infer Tail extends (StructType<undefined, never> | StructType<{ key: string, value: any }, any>)[]] ? Head extends StructType<undefined, never> ? RemovePadding<Tail> : [Head, ...RemovePadding<Tail>] :
  T extends readonly [infer Head, ...infer Tail extends readonly (StructType<undefined, never> | StructType<{ key: string, value: any }, any>)[]] ? Head extends StructType<undefined, never> ? RemovePadding<Tail> : [Head, ...RemovePadding<Tail>] : [];

type ToPojo<T extends StructType<{ key: string, value: any }, any>[]> = {
  [P in (T[number] extends StructType<infer DataType, any> ? DataType extends { key: string, value: any } ? DataType['key'] : never : never)]:
    Extract<T[number], StructType<{ key: P, value: any }, any>> extends StructType<infer DataType, any>
      ? DataType extends { key: P, value: infer Value } ? Value : never
      : never
}

type GetReadErrors<T extends StructType<any, any>[]> = T[number] extends StructType<any, infer E> ? E : never;
