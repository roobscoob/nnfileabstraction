// import { StringEncoding } from "../../enums";
// import {ReadableSpan, ReadOutOfBoundsError, ResizableSpan, SliceOutOfBoundsError} from "../../span";
// import { Struct } from "../../struct/struct";
// import { Types } from "../../struct/type";
// import {Future, StringDecodeError} from "../../util";
//
// export class PartitionFileSystemHeader extends Struct.Definition(<const> [
//   Struct.Field("magic", Types.FixedString(4, StringEncoding.UTF8)),
//   Struct.Field("fileCount", Types.UInt32),
//   Struct.Field("stringTableSize", Types.UInt32),
//   Struct.Padding(4),
// ]) {
//   static Size = 16;
//   static Magic = "PFS0";
//
//   isMagicValid() {
//     return this.value.magic === PartitionFileSystemHeader.Magic;
//   }
//
//   getFileCount() {
//     return this.value.fileCount;
//   }
//
//   getStringTableSize() {
//     return this.value.stringTableSize;
//   }
// }
//
// export class PartitionFileSystemFileEntry extends Struct.Definition(<const> [
//   Struct.Field("dataOffset", Types.UInt64),
//   Struct.Field("dataSize", Types.UInt64),
//   Struct.Field("stringOffset", Types.UInt32),
//   Struct.Padding(4),
// ]) {
//   static Size = 24;
//
//   getData<T>(span: ReadableSpan<T>): Future<ReadableSpan<T>, SliceOutOfBoundsError> {
//     return span.slice(this.value.dataOffset, this.value.dataSize);
//   }
//
//   getString<T>(span: ReadableSpan<T>): Future<string, T | ReadOutOfBoundsError | StringDecodeError> {
//     return span.getStringToNull(this.value.stringOffset, StringEncoding.UTF8).map(e => e.value);
//   }
// }
