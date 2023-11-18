import { Endianness, StringEncoding } from "../enums";
import { ReadOutOfBoundsError, ReadableSpan, WritableSpan, WriteOutOfBoundsError } from "../span";
import { Future } from "../util/future";
import { StringDecodeError } from "../util/stringUtils";

export abstract class StructType<Type, ReadError> {
  #____doNotAccess!: ReadError;

  abstract read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness): Future<{ value: Type, bytesRead: number }, RE | ReadOutOfBoundsError | ReadError>;
  abstract write<WE>(offset: number, value: Type, span: WritableSpan<any, any, WE>, endianness: Endianness): Future<void, WE | WriteOutOfBoundsError>;
}

export class Types {
  static UInt8 = new class UInt8 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return span.getUInt8(offset).map(value => ({ value, bytesRead: 1 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>) {
      return span.setUInt8(offset, value);
    }
  }

  static SInt8 = new class SInt8 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return span.getSInt8(offset).map(value => ({ value, bytesRead: 1 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>) {
      return span.setSInt8(offset, value);
    }
  }

  static UInt16 = new class UInt16 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getUInt16BE(offset) : span.getUInt16LE(offset)).map(value => ({ value, bytesRead: 2 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setUInt16BE(offset, value) : span.setUInt16LE(offset, value));
    }
  }

  static SInt16 = new class SInt16 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getSInt16BE(offset) : span.getSInt16LE(offset)).map(value => ({ value, bytesRead: 2 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setSInt16BE(offset, value) : span.setSInt16LE(offset, value));
    }
  }

  static UInt32 = new class UInt32 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getUInt32BE(offset) : span.getUInt32LE(offset)).map(value => ({ value, bytesRead: 4 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setUInt32BE(offset, value) : span.setUInt32LE(offset, value));
    }
  }

  static SInt32 = new class SInt32 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getSInt32BE(offset) : span.getSInt32LE(offset)).map(value => ({ value, bytesRead: 4 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setSInt32BE(offset, value) : span.setSInt32LE(offset, value));
    }
  }

  static UInt64 = new class UInt64 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getUInt64BE(offset) : span.getUInt64LE(offset)).map(value => ({ value, bytesRead: 8 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setUInt64BE(offset, value) : span.setUInt64LE(offset, value));
    }
  }

  static SInt64 = new class SInt64 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getSInt64BE(offset) : span.getSInt64LE(offset)).map(value => ({ value, bytesRead: 8 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setSInt64BE(offset, value) : span.setSInt64LE(offset, value));
    }
  }

  static UBigInt64 = new class UBigInt64 extends StructType<bigint, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getUBigInt64BE(offset) : span.getUBigInt64LE(offset)).map(value => ({ value, bytesRead: 8 }));
    }

    write<WE>(offset: number, value: bigint, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setUBigInt64BE(offset, value) : span.setUBigInt64LE(offset, value));
    }
  }

  static SBigInt64 = new class SBigInt64 extends StructType<bigint, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getSBigInt64BE(offset) : span.getSBigInt64LE(offset)).map(value => ({ value, bytesRead: 8 }));
    }

    write<WE>(offset: number, value: bigint, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setSBigInt64BE(offset, value) : span.setSBigInt64LE(offset, value));
    }
  }

  static Float32 = new class Float32 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getFloat32BE(offset) : span.getFloat32LE(offset)).map(value => ({ value, bytesRead: 4 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setFloat32BE(offset, value) : span.setFloat32LE(offset, value));
    }
  }

  static Float64 = new class Float64 extends StructType<number, never> {
    read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.getFloat64BE(offset) : span.getFloat64LE(offset)).map(value => ({ value, bytesRead: 8 }));
    }

    write<WE>(offset: number, value: number, span: WritableSpan<any, any, WE>, endianness: Endianness) {
      return (endianness === Endianness.BigEndian ? span.setFloat64BE(offset, value) : span.setFloat64LE(offset, value));
    }
  }

  static FixedString(size: number, format: StringEncoding) {
    return new class FixedString extends StructType<string, StringDecodeError> {
      read<RE>(offset: number, span: ReadableSpan<RE>) {
        return span.getString(offset, size, format).map(value => ({ value, bytesRead: size }));
      }

      write<WE>(offset: number, value: string, span: WritableSpan<any, any, WE>, endianness: Endianness) {
        return span.setString(offset, value, format) as unknown as Future<void, WE | WriteOutOfBoundsError>;
      }
    }
  }

  static NullTerminatedString(format: StringEncoding) {
    return new class NullTerminatedString extends StructType<string, StringDecodeError> {
      read<RE>(offset: number, span: ReadableSpan<RE>) {
        return span.getStringToNull(offset, format)
      }

      write<WE>(offset: number, value: string, span: WritableSpan<any, any, WE>, endianness: Endianness) {
        return span.setString(offset, value, format).map(v => span.setUInt8(offset + v, 0));
      }
    }
  }
}