import { FolderContentType } from "./enums";
import { Iterator } from "./util/iterator";
import { Option } from "./util/option";
import { Result } from "./util/result";

export abstract class IdentifierType {
  abstract equals(other: IdentifierType): boolean;
  abstract toString(): string;
}

export type FolderRecord<Identifier extends IdentifierType, FileType extends File, FolderType extends Folder<any, any, any>> = {
  identifier: Identifier,
  kind: FolderContentType.File,
  content: FileType
} | {
  identifier: Identifier,
  kind: FolderContentType.Folder,
  content: FolderType
}

export abstract class Folder<Identifier extends IdentifierType, FileType extends File, FolderType extends Folder<any, any, any>> {
  abstract get(t: Identifier): Option<FileType | FolderType>;
  abstract list(): Iterator<FolderRecord<Identifier, FileType, FolderType>>;
}

export abstract class MutableFolder<Identifier extends IdentifierType, FileType extends File, FolderType extends Folder<any, any, any>, SetError> extends Folder<Identifier, FileType, FolderType> {
  abstract set(identifier: Identifier, content: FileType | FolderType): Result<void, SetError>;
}