import { FolderContentType } from "./enums";
import { AsyncIterator } from "./util/asyncIterator";
import { Future } from "./util/future";
import { Iterator } from "./util/iterator";
import { Option } from "./util/option";
import { Result } from "./util/result";

export abstract class IdentifierType {
  abstract equals(other: IdentifierType): boolean;
  abstract toString(): string;
}

export type FolderRecord<Identifier extends IdentifierType, FileType, FolderType extends Folder<any, any, any, any, any, any>> = {
  identifier: Identifier,
  kind: FolderContentType.File,
  content: FileType
} | {
  identifier: Identifier,
  kind: FolderContentType.Folder,
  content: FolderType
}

export abstract class Folder<Identifier extends IdentifierType, FileType, FolderType extends Folder<any, any, any, any, any, any>, GetError, ListError, ListItemError> {
  abstract get(t: Identifier): Future<FileType | FolderType, GetError>;
  abstract list(): Future<AsyncIterator<Result<FolderRecord<Identifier, FileType, FolderType>, ListItemError>>, ListError>;
}

export abstract class MutableFolder<Identifier extends IdentifierType, FileType, FolderType extends Folder<any, any, any, any, any, any>, GetError, ListError, ListItemError, CreateFolderError, CreateFileError> extends Folder<Identifier, FileType, FolderType, GetError, ListError, ListItemError> {
  abstract createFolder(identifier: Identifier): Future<FolderType, CreateFolderError>;
  abstract createFile(identifier: Identifier): Future<FileType, CreateFileError>;
}