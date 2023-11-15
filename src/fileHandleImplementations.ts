import { AsyncFile, File } from "./file";
import fs from "node:fs";
import { Future } from "./util/future";
import { ReadOutOfBoundsError, ResizableAsyncSpan } from "./span";
import { Result } from "./util/result";
import { Iterator } from "./util/iterator";
import { Fn } from "./util/fn";
import { Option } from "./util/option";
import { ArrayBufferUtils } from "./util/arrayBufferUtils";
import { StringEncoding } from "./enums";

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

type SystemFileOpenConfig = {
  async: boolean,
}

export class SystemFile extends AsyncFile<NodeJS.ErrnoException, NodeJS.ErrnoException, SystemFileSpan, SystemFileMetadata> {
  constructor(
    protected readonly path: string,
  ) { super() }

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

export class SystemFileSpan extends ResizableAsyncSpan<NodeJS.ErrnoException, NodeJS.ErrnoException, NodeJS.ErrnoException> {
  public static DEFAULT_PAGE_SIZE = 4096;

  private static EMPTY_PAGE = SystemFilePage.fromData(new DataView(new ArrayBuffer(0)));

  constructor(
    private readonly fd: number,
    private readonly pageSize: number,
    private fileSize: number,
  ) { super() }

  private pageCache: Map<number, SystemFilePage | Future<SystemFilePage, NodeJS.ErrnoException>> = new Map();
  private dirtyPages: Set<SystemFilePage> = new Set();

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

  private getPageInfo(offset: number): { page: number, pageOffset: number } {
    return {
      page: Math.floor(offset / this.pageSize),
      pageOffset: offset % this.pageSize,
    };
  }

  private getPageInfos(offset: number, length: number): Iterator<{ page: number, pageOffset: number, length: number }> {
    const { page: startPage, pageOffset: startPageOffset } = this.getPageInfo(offset);
    const { page: endPage, pageOffset: endPageOffset } = this.getPageInfo(offset + length);

    return Iterator
      .range(startPage, endPage)
      .map(page => ({
        page,
        pageOffset: page === startPage ? startPageOffset : 0,
        length: page === endPage ? endPageOffset : this.pageSize - (page === startPage ? startPageOffset : 0),
      }));
  }

  private readChunk(offset: number, length: number) {
    return this
      .getPageInfos(offset, length)
      .collectFuture(({ page, pageOffset, length }, sum) => this
        .readPage(page)
        .mapOk(pageView => [...sum, ArrayBufferUtils.slice(pageView.getData(), pageOffset, pageOffset + length)]), <DataView[]> [])
      .mapOk(ArrayBufferUtils.sumView)
  }

  private readChunkUntilByte(offset: number, byte: number) {
    const { page: startPage, pageOffset: startPageOffset } = this.getPageInfo(offset);

    return Iterator
      .range(startPage, Infinity)
      .map(page => this.readPage(page).mapOk(v => ArrayBufferUtils.slice(v.getData(), page === startPage ? startPageOffset : 0)))
      .collectFuture((viewFuture, sum, terminate) => viewFuture.mapOk(view => Option
        .fromNoneToken(<const> -1, ArrayBufferUtils.toU8Array(view).indexOf(byte))
        .ifNone(terminate)
        .map(index => [...sum, ArrayBufferUtils.slice(view, 0, index)])
        .unwrapOr(sum)), <DataView[]> [])
      .mapOk(ArrayBufferUtils.sumView);
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
    this.growIfNeeded(offset, 1);

    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPage(page)
      .mapOk(p => p.setDirty())
      .map(pageView => pageView.getOrGrowTo(offset + 1).setUint8(pageOffset, value));
  }

  getSInt8(offset: number) {
    const { page, pageOffset } = this.getPageInfo(offset);

    return this
      .readPage(page)
      .map(pageView => Result.try(() => pageView.getData().getInt8(pageOffset)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 1, e));
  }

  getUInt16BE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getUint16(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  getUInt16LE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getUint16(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  getSInt16BE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getInt16(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  getSInt16LE(offset: number) {
    return this
      .readChunk(offset, 2)
      .map(dataView => Result.try(() => dataView.getInt16(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 2, e));
  }

  getUInt32BE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getUint32(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  getUInt32LE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getUint32(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  getSInt32BE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getInt32(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  getSInt32LE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getInt32(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  getFloat32BE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getFloat32(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  getFloat32LE(offset: number) {
    return this
      .readChunk(offset, 4)
      .map(dataView => Result.try(() => dataView.getFloat32(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 4, e));
  }

  getFloat64BE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getFloat64(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  getFloat64LE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getFloat64(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  getBigInt64BE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigInt64(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  getBigInt64LE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigInt64(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  getBigUInt64BE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigUint64(0, false)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  getBigUInt64LE(offset: number) {
    return this
      .readChunk(offset, 8)
      .map(dataView => Result.try(() => dataView.getBigUint64(0, true)))
      .mapErr(e => new ReadOutOfBoundsError(offset, 8, e));
  }

  getUInt64BE(offset: number) {
    return this
      .getBigUInt64BE(offset)
      .mapOk(v => Number(v));
  }

  getUInt64LE(offset: number) {
    return this
      .getBigUInt64LE(offset)
      .mapOk(v => Number(v));
  }

  getSInt64BE(offset: number) {
    return this
      .getBigInt64BE(offset)
      .mapOk(v => Number(v));
  }

  getSInt64LE(offset: number) {
    return this
      .getBigInt64LE(offset)
      .mapOk(v => Number(v));
  }

  getByteSlice(offset: number, length: number) {
    return this.readChunk(offset, length);
  }

  getByteSliceToEnd(offset: number) {
    return this.readChunk(offset, this.fileSize - offset);
  }

  getByteSliceToNull(offset: number) {
    return this.readChunkUntilByte(offset, 0x00);
  }
}