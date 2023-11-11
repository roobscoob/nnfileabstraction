import { FileHandle } from "./fileHandle";
import { Result } from "./util/result";

export abstract class File<OpenErrors, MetadataType> {
  abstract open(): Result<FileHandle, OpenErrors>;
  abstract getMetadata(): MetadataType;
}