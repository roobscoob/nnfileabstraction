import { ReadOutOfBoundsError, ReadableSpan, ResizableSpan, SliceOutOfBoundsError, WritableSpan, WriteOutOfBoundsError } from "../span";
import { Future } from "../util/future";
import { Result } from "../util/result";

export class SliceReadableSpan<T> extends ReadableSpan<T> {
  private readonly span: ReadableSpan<T>;
  private readonly start: number;
  private readonly end?: number;

  static slice<T>(span: ReadableSpan<T>, start: number, end?: number): Result<SliceReadableSpan<T>, SliceOutOfBoundsError> {
    if (start < 0 || (end !== undefined && end > span.getSize()))
      return Result.err(new SliceOutOfBoundsError(start, span.getSize(), end));

    return Result.ok(new SliceReadableSpan(span, start, end));
  }

  protected constructor(span: ReadableSpan<T>, start: number, end?: number) {
    super();

    this.span = span;
    this.start = start;
    this.end = end;
  }

  getSize(): number {
    return Math.min((this.end ?? this.span.getSize()), this.span.getSize()) - this.start;
  }

  private assertRange(offset: number, size: number): Future<void, ReadOutOfBoundsError> {
    if (offset < 0 || (offset + size) > this.getSize())
      return Future.err(new ReadOutOfBoundsError(offset, this.getSize(), size));

    return Future.ok(undefined);
  }

  getUInt8(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 1)
      .map(() => this.span.getUInt8(this.start + offset));
  }

  getSInt8(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 1)
      .map(() => this.span.getSInt8(this.start + offset));
  }

  getUInt16LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 2)
      .map(() => this.span.getUInt16LE(this.start + offset));
  }

  getUInt16BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 2)
      .map(() => this.span.getUInt16BE(this.start + offset));
  }

  getSInt16LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 2)
      .map(() => this.span.getSInt16LE(this.start + offset));
  }

  getSInt16BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 2)
      .map(() => this.span.getSInt16BE(this.start + offset));
  }

  getUInt32LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 4)
      .map(() => this.span.getUInt32LE(this.start + offset));
  }

  getUInt32BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 4)
      .map(() => this.span.getUInt32BE(this.start + offset));
  }

  getSInt32LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 4)
      .map(() => this.span.getSInt32LE(this.start + offset));
  }

  getSInt32BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 4)
      .map(() => this.span.getSInt32BE(this.start + offset));
  }

  getUInt64LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getUInt64LE(this.start + offset));
  }

  getUInt64BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getUInt64BE(this.start + offset));
  }

  getSInt64LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getSInt64LE(this.start + offset));
  }

  getSInt64BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getSInt64BE(this.start + offset));
  }

  getUBigInt64LE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getUBigInt64LE(this.start + offset));
  }

  getUBigInt64BE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getUBigInt64BE(this.start + offset));
  }

  getSBigInt64LE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getSBigInt64LE(this.start + offset));
  }

  getSBigInt64BE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getSBigInt64BE(this.start + offset));
  }

  getFloat32LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 4)
      .map(() => this.span.getFloat32LE(this.start + offset));
  }

  getFloat32BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 4)
      .map(() => this.span.getFloat32BE(this.start + offset));
  }

  getFloat64LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getFloat64LE(this.start + offset));
  }

  getFloat64BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, 8)
      .map(() => this.span.getFloat64BE(this.start + offset));
  }

  getByteSlice(offset: number, length: number): Future<DataView, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, length)
      .map(() => this.span.getByteSlice(this.start + offset, length));
  }

  getByteSliceToEnd(offset: number): Future<DataView, T | ReadOutOfBoundsError> {
    return this
      .assertRange(offset, this.getSize() - offset)
      .map(() => this.span.getByteSlice(this.start + offset, this.getSize() - offset));
  }

  getByteSliceToNull(offset: number): Future<DataView, T | ReadOutOfBoundsError> {
    return this.assertRange(offset, 0).map(() => 
      this.span.getByteSliceToNull(this.start + offset)
        .map(dataView => {
          const length = dataView.byteLength;

          if (length > this.getSize() - offset)
            return new DataView(dataView.buffer, dataView.byteOffset, this.getSize() - offset);

          return dataView;
        }));
  }

  slice(offset: number, length: number = this.getSize() - offset): Future<ReadableSpan<T>, SliceOutOfBoundsError> {
    return this
      .assertRange(offset, length)
      .map(() => this.span.slice(this.start + offset, length));
  }
}

export class SliceWritableSpan<T2, T, T3> extends WritableSpan<T2, T, T3> {
  private readonly span: WritableSpan<T2, T, T3>;
  private readonly start: number;
  private readonly end?: number;

  static slice<T2, T, T3>(span: WritableSpan<T2, T, T3>, start: number, end?: number): Result<SliceWritableSpan<T2, T, T3>, SliceOutOfBoundsError> {
    if (start < 0 || (end !== undefined && end > span.getSize()))
      return Result.err(new SliceOutOfBoundsError(start, span.getSize(), end));

    return Result.ok(new SliceWritableSpan(span, start, end));
  }

  static sliceResizable<BFlush, BResize, BRead, BWrite>(span: ResizableSpan<BFlush, BResize, BRead, BWrite>, start: number, end?: number): Result<SliceWritableSpan<BFlush, BRead, BWrite | BResize>, SliceOutOfBoundsError> {
    if (start < 0 || (end !== undefined && end > span.getSize()))
      return Result.err(new SliceOutOfBoundsError(start, span.getSize(), end));

    return Result.ok(new SliceWritableSpan(span as any, start, end));
  }

  protected constructor(span: WritableSpan<T2, T, T3>, start: number, end?: number) {
    super();

    this.span = span;
    this.start = start;
    this.end = end;
  }

  getSize(): number {
    return Math.min((this.end ?? this.span.getSize()), this.span.getSize()) - this.start;
  }

  private assertReadableRange(offset: number, size: number): Future<void, ReadOutOfBoundsError> {
    if (offset < 0 || (offset + size) > this.getSize())
      return Future.err(new ReadOutOfBoundsError(offset, this.getSize(), size));

    return Future.ok(undefined);
  }

  private assertWritableRange(offset: number, size: number): Future<void, WriteOutOfBoundsError> {
    if (offset < 0 || (offset + size) > this.getSize())
      return Future.err(new WriteOutOfBoundsError(offset, this.getSize(), size));

    return Future.ok(undefined);
  }

  getUInt8(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 1)
      .map(() => this.span.getUInt8(this.start + offset));
  }

  setUInt8(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 1)
      .map(() => this.span.setUInt8(this.start + offset, value));
  }

  getSInt8(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 1)
      .map(() => this.span.getSInt8(this.start + offset));
  }

  setSInt8(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 1)
      .map(() => this.span.setSInt8(this.start + offset, value));
  }

  getUInt16LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 2)
      .map(() => this.span.getUInt16LE(this.start + offset));
  }

  setUInt16LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 2)
      .map(() => this.span.setUInt16LE(this.start + offset, value));
  }

  getUInt16BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 2)
      .map(() => this.span.getUInt16BE(this.start + offset));
  }

  setUInt16BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 2)
      .map(() => this.span.setUInt16BE(this.start + offset, value));
  }

  getSInt16LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 2)
      .map(() => this.span.getSInt16LE(this.start + offset));
  }

  setSInt16LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 2)
      .map(() => this.span.setSInt16LE(this.start + offset, value));
  }

  getSInt16BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 2)
      .map(() => this.span.getSInt16BE(this.start + offset));
  }

  setSInt16BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 2)
      .map(() => this.span.setSInt16BE(this.start + offset, value));
  }

  getUInt32LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 4)
      .map(() => this.span.getUInt32LE(this.start + offset));
  }

  setUInt32LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 4)
      .map(() => this.span.setUInt32LE(this.start + offset, value));
  }

  getUInt32BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 4)
      .map(() => this.span.getUInt32BE(this.start + offset));
  }

  setUInt32BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 4)
      .map(() => this.span.setUInt32BE(this.start + offset, value));
  }

  getSInt32LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 4)
      .map(() => this.span.getSInt32LE(this.start + offset));
  }

  setSInt32LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 4)
      .map(() => this.span.setSInt32LE(this.start + offset, value));
  }

  getSInt32BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 4)
      .map(() => this.span.getSInt32BE(this.start + offset));
  }

  setSInt32BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 4)
      .map(() => this.span.setSInt32BE(this.start + offset, value));
  }

  getUInt64LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getUInt64LE(this.start + offset));
  }

  setUInt64LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setUInt64LE(this.start + offset, value));
  }

  getUInt64BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getUInt64BE(this.start + offset));
  }

  setUInt64BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setUInt64BE(this.start + offset, value));
  }

  getSInt64LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getSInt64LE(this.start + offset));
  }

  setSInt64LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setSInt64LE(this.start + offset, value));
  }

  getSInt64BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getSInt64BE(this.start + offset));
  }

  setSInt64BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setSInt64BE(this.start + offset, value));
  }

  getUBigInt64LE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getUBigInt64LE(this.start + offset));
  }

  setUBigInt64LE(offset: number, value: bigint): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setUBigInt64LE(this.start + offset, value));
  }

  getUBigInt64BE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getUBigInt64BE(this.start + offset));
  }

  setUBigInt64BE(offset: number, value: bigint): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setUBigInt64BE(this.start + offset, value));
  }

  getSBigInt64LE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getSBigInt64LE(this.start + offset));
  }

  setSBigInt64LE(offset: number, value: bigint): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setSBigInt64LE(this.start + offset, value));
  }

  getSBigInt64BE(offset: number): Future<bigint, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getSBigInt64BE(this.start + offset));
  }

  setSBigInt64BE(offset: number, value: bigint): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setSBigInt64BE(this.start + offset, value));
  }

  getFloat32LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 4)
      .map(() => this.span.getFloat32LE(this.start + offset));
  }

  setFloat32LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 4)
      .map(() => this.span.setFloat32LE(this.start + offset, value));
  }

  getFloat32BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 4)
      .map(() => this.span.getFloat32BE(this.start + offset));
  }

  setFloat32BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 4)
      .map(() => this.span.setFloat32BE(this.start + offset, value));
  }

  getFloat64LE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getFloat64LE(this.start + offset));
  }

  setFloat64LE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setFloat64LE(this.start + offset, value));
  }

  getFloat64BE(offset: number): Future<number, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, 8)
      .map(() => this.span.getFloat64BE(this.start + offset));
  }

  setFloat64BE(offset: number, value: number): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, 8)
      .map(() => this.span.setFloat64BE(this.start + offset, value));
  }

  getByteSlice(offset: number, length: number): Future<DataView, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, length)
      .map(() => this.span.getByteSlice(this.start + offset, length));
  }

  setByteSlice(offset: number, value: DataView): Future<void, T3 | WriteOutOfBoundsError> {
    return this
      .assertWritableRange(offset, value.byteLength)
      .map(() => this.span.setByteSlice(this.start + offset, value));
  }

  getByteSliceToEnd(offset: number): Future<DataView, T | ReadOutOfBoundsError> {
    return this
      .assertReadableRange(offset, this.getSize() - offset)
      .map(() => this.span.getByteSlice(this.start + offset, this.getSize() - offset));
  }

  getByteSliceToNull(offset: number): Future<DataView, T | ReadOutOfBoundsError> {
    return this.span.getByteSliceToNull(this.start + offset)
      .map(dataView => {
        const length = dataView.byteLength;

        if (length > this.getSize() - offset)
          return new DataView(dataView.buffer, dataView.byteOffset, this.getSize() - offset);

        return dataView;
      });
  }

  slice(offset: number, length: number = this.getSize() - offset): Future<ReadableSpan<T>, SliceOutOfBoundsError> {
    return this
      .assertReadableRange(offset, length)
      .map(() => this.span.slice(this.start + offset, length));
  }

  sliceMut(offset: number, length?: number | undefined): Future<WritableSpan<T2, T, T3>, SliceOutOfBoundsError> {
    return this
      .assertReadableRange(offset, length ?? this.getSize() - offset)
      .map(() => this.span.sliceMut(this.start + offset, length));
  }

  flush() {
    return this.span.flush();
  }
}