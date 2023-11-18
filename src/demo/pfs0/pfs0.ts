import { Endianness, FolderContentType, StringEncoding } from "../../enums";
import { StringIdentifier } from "../../fileHandleImplementations/stringIdentifier";
import { Folder, FolderRecord } from "../../folder";
import { ReadOutOfBoundsError, ReadableSpan, ResizableSpan } from "../../span";
import { Struct } from "../../struct/struct";
import { Types } from "../../struct/type";
import { AsyncIterator } from "../../util/asyncIterator";
import { Future } from "../../util/future";
import { Result } from "../../util/result";
import { StringDecodeError } from "../../util/stringUtils";
import { InvalidFileEntryDataError, InvalidFileEntryNameError, InvalidMagicError, NotEnoughBytesAvailableError, OffsetArgumentInvalidError, PartitionFileSystemEntryNotFoundError } from "./errors";
import { PartitionFileSystemFileEntry, PartitionFileSystemHeader } from "./structs";

export class PartitionFileSystem<BFlush, BResize, BRead, BWrite> extends Folder<
  StringIdentifier, // Identifier
  ReadableSpan<BRead>, // FileType
  never, // FolderType
  BRead | StringDecodeError | InvalidFileEntryNameError, // GetError
  never, // ListError
  StringDecodeError | BRead | InvalidFileEntryNameError // ListItemError
> {
  static Header = PartitionFileSystemHeader;
  static FileEntry = PartitionFileSystemFileEntry;

  static async isPartitionFileSystem<T>(span: ResizableSpan<any, any, T, any>, offset = 0) {
    const magic = await span.getString(offset, 4, StringEncoding.UTF8);

    if (magic.isOk())
      return Result.ok(magic.unwrap() === PartitionFileSystemHeader.Magic);

    const err = magic.unwrapErr();

    if (err instanceof StringDecodeError)
      return Result.ok(false);

    return Result.err(err);
  }

  static loadFuture<TFlush, TResize, TRead, TWrite>(span: ResizableSpan<TFlush, TResize, TRead, TWrite>, offset = 0) {
    return Future.fromAsyncResult(() => this.load(span, offset));
  }

  static async load<TFlush, TResize, TRead, TWrite>(span: ResizableSpan<TFlush, TResize, TRead, TWrite>, offset = 0):
    Promise<Result<PartitionFileSystem<TFlush, TResize, TRead, TWrite>, TRead | NotEnoughBytesAvailableError | InvalidMagicError | OffsetArgumentInvalidError>> {
    const subSlice = await span.slice(offset)
      .mapErr(e => new OffsetArgumentInvalidError(offset, span.getSize()));

    if (subSlice.isErr()) return subSlice;

    const header = await PartitionFileSystem.Header.deserialize(subSlice.unwrap(), Endianness.LittleEndian);

    if (header.isErr() && header.unwrapErr() instanceof ReadOutOfBoundsError)
      return Result.err(new NotEnoughBytesAvailableError("header", PartitionFileSystemHeader.Size, subSlice.unwrap().getSize()));

    if (header.isErr() && header.unwrapErr() instanceof StringDecodeError)
      return Result.err(new InvalidMagicError(this.Header.Magic))
    
    if (header.isErr()) return header as Result<never, TRead>;

    const headerValue = <PartitionFileSystemHeader> header.unwrap();

    if (!headerValue.isMagicValid())
      return Result.err(new InvalidMagicError(this.Header.Magic));

    const fileEntryTableSize = headerValue.getFileCount() * PartitionFileSystemFileEntry.Size;
    const fileEntryTable = await subSlice.unwrap()
      .slice(PartitionFileSystemHeader.Size, fileEntryTableSize)
      .mapErr(e => new NotEnoughBytesAvailableError("fileEntryTable", fileEntryTableSize, subSlice.unwrap().getSize()));

    if (fileEntryTable.isErr()) return fileEntryTable;

    const stringTableSize = headerValue.getStringTableSize();
    const stringTable = await subSlice.unwrap()
      .slice(PartitionFileSystemHeader.Size + fileEntryTableSize, stringTableSize)
      .mapErr(e => new NotEnoughBytesAvailableError("stringTable", stringTableSize, subSlice.unwrap().getSize()));

    if (stringTable.isErr()) return stringTable;

    const fileData = await subSlice.unwrap()
      .slice(PartitionFileSystemHeader.Size + fileEntryTableSize + stringTableSize)
      .mapErr(e => new NotEnoughBytesAvailableError("fileData", subSlice.unwrap().getSize() - (PartitionFileSystemHeader.Size + fileEntryTableSize + stringTableSize), subSlice.unwrap().getSize()));
  
    if (fileData.isErr()) return fileData;
    
    return Result.ok(new this(span, headerValue, fileEntryTable.unwrap(), stringTable.unwrap(), fileData.unwrap()));
  }

  constructor(
    private readonly span: ResizableSpan<BFlush, BResize, BRead, BWrite>,
    private readonly header: PartitionFileSystemHeader,
    private readonly fileEntryTable: ReadableSpan<BRead>,
    private readonly stringTable: ReadableSpan<BRead>,
    private readonly fileData: ReadableSpan<BRead>,
  ) {
    super();
  }

  private getFileEntry(offset: number) {
    return PartitionFileSystem.FileEntry.deserialize(this.fileEntryTable, Endianness.LittleEndian, offset)
      .mapErr(e => new OffsetArgumentInvalidError(offset, this.fileEntryTable.getSize()));
  }

  private async entryToRecord(entry: PartitionFileSystemFileEntry) {
    const name = await entry.getString(this.stringTable)
      .mapErr(e => e instanceof ReadOutOfBoundsError ? new InvalidFileEntryNameError() : e);

    if (name.isErr()) return name;

    const data = await entry.getData(this.fileData)
      .mapErr(e => e instanceof ReadOutOfBoundsError ? new InvalidFileEntryDataError() : e);

    if (data.isErr()) return data;

    return Result.ok({
      identifier: new StringIdentifier(name.unwrap()),
      content: data.unwrap(),
      kind: <const> FolderContentType.File,
    })
  }

  list() {
    return Future.ok(AsyncIterator.range(0, this.fileEntryTable.getSize(), PartitionFileSystem.FileEntry.Size)
      .map(index => this.getFileEntry(index).unwrap() as any as PartitionFileSystemFileEntry)
      .map(entry => this.entryToRecord(entry)))
  }

  get(identifier: StringIdentifier | string) {
    identifier = typeof identifier === "string" ? new StringIdentifier(identifier) : identifier;

    return <Future<ReadableSpan<BRead>, StringDecodeError | BRead | InvalidFileEntryNameError | PartitionFileSystemEntryNotFoundError>> this
      .list()
      .map(list => list.find(e => e.isErr() || e.unwrap().identifier.equals(identifier as StringIdentifier)))
      .map(m => m.unwrapOr(Result.err(new PartitionFileSystemEntryNotFoundError(identifier as StringIdentifier))))
      .map(m => m.content);
  }
}
