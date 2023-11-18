import fs from "node:fs";
import { Future } from "../util/future";
import { ReadOutOfBoundsError, ReadableSpan, ResizableSpan, SliceOutOfBoundsError, WritableSpan } from "../span";
import { Result } from "../util/result";
import { Iterator } from "../util/iterator";
import { Fn } from "../util/fn";
import { Option } from "../util/option";
import { ArrayBufferUtils } from "../util/arrayBufferUtils";
import { StringEncoding } from "../enums";
import { SliceReadableSpan, SliceWritableSpan } from "./slice";
import { AsyncIterator } from "../util/asyncIterator";
import { MutableFolder } from "../folder";
import { type SystemFolder } from "./systemFolder";
import { ExpectedFolderFoundFileError } from "./expectationErrors";

export class SystemFileMetadata {
  static fromPath(path: string): Future<SystemFileMetadata, NodeJS.ErrnoException> {
    return Future
      .promisify(fs.stat, path, { bigint: true })
      .map(stats => SystemFileMetadata.fromStats(path, <fs.BigIntStats> stats));
  }

  static fromStats(path: string, stats: fs.BigIntStats): SystemFileMetadata {
    return new SystemFileMetadata(
      path,
      stats.dev,
      stats.ino,
      stats.mode,
      stats.nlink,
      stats.uid,
      stats.gid,
      stats.rdev,
      stats.size,
      stats.blksize,
      stats.blocks,
      stats.atimeNs,
      stats.mtimeNs,
      stats.ctimeNs,
      stats.birthtimeNs,
    );
  }

  constructor(
    public readonly path: string,
    public readonly dev: bigint,
    public readonly ino: bigint,
    public readonly mode: bigint,
    public readonly nlink: bigint,
    public readonly uid: bigint,
    public readonly gid: bigint,
    public readonly rdev: bigint,
    public readonly size: bigint,
    public readonly blksize: bigint,
    public readonly blocks: bigint,
    public readonly atimeNs: bigint,
    public readonly mtimeNs: bigint,
    public readonly ctimeNs: bigint,
    public readonly birthtimeNs: bigint
  ) {}
}

export class SystemFile {
  isFolder(): this is SystemFolder { return false }
  isFile(): this is SystemFile { return true }

  expectFolder(): Result<never, ExpectedFolderFoundFileError> { return Result.err(new ExpectedFolderFoundFileError(this.path)); }
  expectFile(): Result<SystemFile, never> { return Result.ok(this); }

  static withMetadata(path: string, metadata: SystemFileMetadata): SystemFile {
    const file = new SystemFile(path);

    file.metadataCache = Future.ok(metadata);

    return file;
  }

  constructor(
    protected readonly path: string,
  ) {}

  private metadataCache: Future<SystemFileMetadata, NodeJS.ErrnoException> | undefined;

  getMetadata(): Future<SystemFileMetadata, NodeJS.ErrnoException> {
    if (this.metadataCache != null)
      return this.metadataCache;

    return this.metadataCache = SystemFileMetadata.fromPath(this.path);
  }

  open(pageSize: number = SystemFileSpan.DEFAULT_PAGE_SIZE): Future<SystemFileSpan, NodeJS.ErrnoException> {
    return this
      .getMetadata()
      .map(metadata => Future.of((resolve, reject) => {
        fs.open(this.path, "r+", (err, fd) => {
          if (err != null)
            return reject(err);
  
          return resolve(new SystemFileSpan(fd, pageSize, Number(metadata.size)));
        });
      }))
  }
}

class SystemFilePage {
  constructor(
    public data: DataView,
  ) {}

  static fromData(data: DataView) {
    return new SystemFilePage(data);
  }

  private dirty = false;

  isDirty() {
    return this.dirty;
  }

  setDirty() {
    this.dirty = true;
    return this;
  }

  clearDirty() {
    this.dirty = false;
    return this;
  }

  getData() {
    return this.data;
  }

  getOrGrowTo(size: number) {
    if (this.data.byteLength < size)
      this.growTo(size);

    return this.getData();
  }

  growTo(size: number) {
    const newData = new ArrayBuffer(size);
    const newDataView = new DataView(newData);

    for (let i = 0; i < this.data.byteLength; i++)
      newDataView.setUint8(i, this.data.getUint8(i));

    this.data = newDataView;

    return this;
  }
}

export class SystemFileSpan extends ResizableSpan<NodeJS.ErrnoException, NodeJS.ErrnoException, NodeJS.ErrnoException, never> {
  public static DEFAULT_PAGE_SIZE = 4096;

  private static EMPTY_PAGE = SystemFilePage.fromData(new DataView(new ArrayBuffer(0)));

  constructor(
    private readonly fd: number,
    private readonly pageSize: number,
    private fileSize: number,
  ) { super() }

  private pageCache: Map<number, SystemFilePage | Future<SystemFilePage, NodeJS.ErrnoException>> = new Map();

  private readPage(page: number): Future<SystemFilePage, NodeJS.ErrnoException> {
    const cached = this.pageCache.get(page);

    if (cached != null)
      if (cached instanceof SystemFilePage)
        return Future.ok(cached);
      else
        return cached;

    const pageBuffer = new ArrayBuffer(this.pageSize);
    const pageView = new DataView(pageBuffer);

    const future = Future.of<SystemFilePage, NodeJS.ErrnoException>((resolve, reject) => {
      fs.read(this.fd, pageView, 0, this.pageSize, page * this.pageSize, (err, bytesRead, buffer) => {
        if (err != null)
          return reject(err);

        if (bytesRead === 0)
          return resolve(SystemFileSpan.EMPTY_PAGE);

        const result = SystemFilePage.fromData(new DataView(buffer.buffer, buffer.byteOffset, bytesRead));
        this.pageCache.set(page, result);
        return resolve(result);
      });
    });

    this.pageCache.set(page, future);

    return future;
  }

  private readPageOrGrow(page: number): Future<SystemFilePage, NodeJS.ErrnoException> {
    return this
      .growIfNeeded(page * this.pageSize, this.pageSize)
      .map(() => this.readPage(page));
  }

  private getPageInfo(offset: number): { page: number, pageOffset: number } {
    return {
      page: Math.floor(offset / this.pageSize),
      pageOffset: offset % this.pageSize,
    };
  }

  private getPageInfos(offset: number, length: number) {
    const { page: startPage, pageOffset: startPageOffset } = this.getPageInfo(offset);
    const { page: endPage, pageOffset: endPageOffset } = this.getPageInfo(offset + length);

    return Iterator
      .range(startPage, endPage)
      .map(page => ({
        page,
        pageOffset: page === startPage ? startPageOffset : 0,
        length: page === endPage ? endPageOffset : this.pageSize - (page === startPage ? startPageOffset : 0),
        deltaPage: page - startPage,
      }));
  }

  private readChunk(offset: number, length: number) {
    return this
      .getPageInfos(offset, length)
      .collectFuture(({ page, pageOffset, length }, sum) => this
        .readPage(page)
        .map(pageView => [...sum, ArrayBufferUtils.slice(pageView.getData(), pageOffset, pageOffset + length)]), <DataView[]> [])
      .map(ArrayBufferUtils.sumView)
  }

  private readChunkUntilByte(offset: number, byte: number) {
    const { page: startPage, pageOffset: startPageOffset } = this.getPageInfo(offset);

    return Future.fromAsyncResult(async () => {
      let u8s: Uint8Array[] = [];

      let currentPage = startPage;

      while (true) {
        let page = await this.readPage(currentPage);

        if (page.isErr())
          return page;

        const u8Array = ArrayBufferUtils.sliceToU8(page.unwrap().getData(), currentPage === startPage ? startPageOffset : 0);
        const index = Option.fromNoneToken(-1, u8Array.indexOf(byte));

        if (index.isNone())
          u8s.push(u8Array);
        else
          return Result.ok(ArrayBufferUtils.sumView([...u8s, u8Array.slice(0, index.unwrap())]));
      }
    });
  }

  getSize(): number {
    return this.fileSize;
  }

  setSize(size: number) {
    this.fileSize = size;

    return <Future<void, NodeJS.ErrnoException>> Future.promisify(fs.ftruncate, this.fd, size)
  }

  growIfNeeded(offset: number, length: number) {
    if (offset + length > this.fileSize)
      return this.setSize(offset + length);

    return Future.ok(undefined);
  }

  getUInt8(offset: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPage(page)
      .map(pageView => Result.try(() => pageView.getData().getUint8(pageOffset)))
      // getUInt8 only throws a RangeError if the offset is out of bounds
      // thus, we can safely map the error to a ReadOutOfBoundsError
      .mapErr(e => new ReadOutOfBoundsError(offset, 1, e));
  }

  setUInt8(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setUint8(pageOffset, value))
  }

  getSInt8(offset: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPage(page)
      .map(pageView => Result.try(() => pageView.getData().getInt8(pageOffset)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 1, e));
  }

  setSInt8(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setInt8(pageOffset, value))
  }

  getUInt16BE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getUint16(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  setUInt16BE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setUint16(pageOffset, value, false))
  }

  getUInt16LE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getUint16(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  setUInt16LE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setUint16(pageOffset, value, true))
  }

  getSInt16BE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getInt16(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  setSInt16BE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setInt16(pageOffset, value, false))
  }

  getSInt16LE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getInt16(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  setSInt16LE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setInt16(pageOffset, value, true))
  }

  getUInt32BE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getUint32(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  setUInt32BE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setUint32(pageOffset, value, false))
  }

  getUInt32LE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getUint32(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  setUInt32LE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setUint32(pageOffset, value, true))
  }

  getSInt32BE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getInt32(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  setSInt32BE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setInt32(pageOffset, value, false))
  }

  getSInt32LE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getInt32(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  setSInt32LE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setInt32(pageOffset, value, true))
  }

  getFloat32BE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getFloat32(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  setFloat32BE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setFloat32(pageOffset, value, false))
  }

  getFloat32LE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getFloat32(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  setFloat32LE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setFloat32(pageOffset, value, true))
  }

  getFloat64BE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getFloat64(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  setFloat64BE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setFloat64(pageOffset, value, false))
  }

  getFloat64LE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getFloat64(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  setFloat64LE(offset: number, value: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setFloat64(pageOffset, value, true))
  }

  getSBigInt64BE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigInt64(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  setSBigInt64BE(offset: number, value: bigint) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setBigInt64(pageOffset, value, false))
  }

  getSBigInt64LE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigInt64(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  setSBigInt64LE(offset: number, value: bigint) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setBigInt64(pageOffset, value, true))
  }

  getUBigInt64BE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigUint64(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  setUBigInt64BE(offset: number, value: bigint) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setBigUint64(pageOffset, value, false))
  }

  getUBigInt64LE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigUint64(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  setUBigInt64LE(offset: number, value: bigint) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPageOrGrow(page)
      .map(v => v
        .setDirty()
        .getData()
        .setBigUint64(pageOffset, value, true))
  }

  getUInt64BE(offset: number) {
    return this
      .getUBigInt64BE(offset)
      .map(v => Number(v));
  }

  setUInt64BE(offset: number, value: number) {
    return this.setUBigInt64BE(offset, BigInt(value));
  }

  getUInt64LE(offset: number) {
    return this
      .getUBigInt64LE(offset)
      .map(v => Number(v));
  }

  setUInt64LE(offset: number, value: number) {
    return this.setUBigInt64LE(offset, BigInt(value));
  }

  getSInt64BE(offset: number) {
    return this
      .getSBigInt64BE(offset)
      .map(v => Number(v));
  }

  setSInt64BE(offset: number, value: number) {
    return this.setSBigInt64BE(offset, BigInt(value));
  }

  getSInt64LE(offset: number) {
    return this
      .getSBigInt64LE(offset)
      .map(v => Number(v));
  }

  setSInt64LE(offset: number, value: number) {
    return this.setSBigInt64LE(offset, BigInt(value));
  }

  getByteSlice(offset: number, length: number) {
    return this.readChunk(offset, length);
  }

  setByteSlice(offset: number, value: DataView) {
    return this
      .getPageInfos(offset, value.byteLength)
      .collectFuture(({ page, pageOffset, length, deltaPage }) => this
        .readPageOrGrow(page)
        .map(v => ArrayBufferUtils
          .toU8Array(v.setDirty().getOrGrowTo(pageOffset + length))
          .set(ArrayBufferUtils.sliceToU8(value, deltaPage * this.pageSize, (deltaPage * this.pageSize) + length), pageOffset)))
  }

  getByteSliceToEnd(offset: number) {
    return this.readChunk(offset, this.fileSize - offset);
  }

  getByteSliceToNull(offset: number) {
    return this.readChunkUntilByte(offset, 0x00);
  }

  slice(offset: number, length?: number): Future<ReadableSpan<NodeJS.ErrnoException>, SliceOutOfBoundsError> {
    return Future.fromDefinedResult(SliceReadableSpan.slice(this, offset, length ? (offset + length) : undefined));
  }

  sliceMut(offset: number, length?: number | undefined): Future<WritableSpan<NodeJS.ErrnoException, NodeJS.ErrnoException, NodeJS.ErrnoException>, SliceOutOfBoundsError> {
    return Future.fromDefinedResult(SliceWritableSpan.sliceResizable(this, offset, length));
  }

  flush(): Future<void, NodeJS.ErrnoException> {
    return (Iterator.over(this.pageCache.entries())
      .filter(p => p[1] instanceof SystemFilePage) as Iterator<[number, SystemFilePage]>)
      .filter(p => p[1].isDirty())
      .collectFuture(([pageIdx, page]) => {
        page.clearDirty();

        return Future.promisify(fs.write, this.fd, page.getData(), 0, page.getData().byteLength, pageIdx * this.pageSize)
      });
  }
}