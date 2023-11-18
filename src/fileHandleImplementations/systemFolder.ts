import { closeSync, ftruncateSync, mkdirSync, openSync, readdir, readdirSync, statSync, truncateSync, writeSync } from "fs";
import { FolderRecord, MutableFolder } from "../folder";
import { Option } from "../util/option";
import { StringIdentifier } from "./stringIdentifier";
import { SystemFile, SystemFileMetadata } from "./systemFile";
import path from "path";
import { Result } from "../util/result";
import { Iterator } from "../util/iterator";
import { FolderContentType } from "../enums";
import { ExpectedFileFoundFolderError, ExpectedFolderFoundFileError } from "./expectationErrors";
import { Future } from "../util/future";
import { AsyncIterator } from "../util/asyncIterator";

enum UnhandledObjectTypes {
  BlockDevice,
  CharacterDevice,
  SymbolicLink,
  Fifo,
  Socket,
  Unknown,
}

export class UnhandledObjectTypeError extends Error {
  constructor(public type: UnhandledObjectTypes) {
    super(`Unhandled object type: ${UnhandledObjectTypes[type]}`);
  }
}

export class SystemFolder extends MutableFolder<StringIdentifier, SystemFile, SystemFolder, NodeJS.ErrnoException | UnhandledObjectTypeError, NodeJS.ErrnoException, UnhandledObjectTypeError, NodeJS.ErrnoException, NodeJS.ErrnoException> {  
  static at(path: string): Future<SystemFolder, NodeJS.ErrnoException | ExpectedFolderFoundFileError | UnhandledObjectTypeError> {
    let stat;
    
    try {
      stat = statSync(path, { bigint: true });
    } catch(err) {
      return Future.err(err as NodeJS.ErrnoException);
    }

    if (!(stat.isDirectory() || stat.isFile())) {
      if (stat.isBlockDevice())
        return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.BlockDevice));
      else if (stat.isCharacterDevice())
        return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.CharacterDevice));
      else if (stat.isSymbolicLink())
        return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.SymbolicLink));
      else if (stat.isFIFO())
        return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Fifo));
      else if (stat.isSocket())
        return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Socket));
      else
        return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Unknown));
    }

    if (stat.isFile())
      return Future.err(new ExpectedFolderFoundFileError(path));

    return Future.ok(new SystemFolder(path));
  }
  
  isFolder(): this is SystemFolder { return true }
  isFile(): this is SystemFile { return false }

  expectFolder(): Result<SystemFolder, never> { return Result.ok(this); }
  expectFile(): Result<never, ExpectedFileFoundFolderError> { return Result.err(new ExpectedFileFoundFolderError(this.path)); }
  
  private constructor(private readonly path: string) {
    super();
  }

  get(identifier: StringIdentifier): Future<SystemFile | SystemFolder, NodeJS.ErrnoException> {
    let stat;
    
    try {
      stat = statSync(path.join(this.path, identifier.toString()), { bigint: true });
    } catch(err) {
      return Future.err(err as NodeJS.ErrnoException);
    }

    if (stat.isFile())
      return Future.ok(new SystemFile(path.join(this.path, identifier.toString())));
    else if (stat.isDirectory())
      return Future.ok(new SystemFolder(path.join(this.path, identifier.toString())));
    else if (stat.isBlockDevice())
      return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.BlockDevice));
    else if (stat.isCharacterDevice())
      return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.CharacterDevice));
    else if (stat.isSymbolicLink())
      return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.SymbolicLink));
    else if (stat.isFIFO())
      return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Fifo));
    else if (stat.isSocket())
      return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Socket));
    else
      return Future.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Unknown));
  }

  list() {
    return Future.promisify(readdir, this.path, { withFileTypes: true })
      .map(r => AsyncIterator.over(r)
        .map(dirent => {
          if (dirent.isFile())
            return Result.ok({ kind: <const> FolderContentType.File, identifier: new StringIdentifier(dirent.name), content: new SystemFile(path.join(this.path, dirent.name)) });
          else if (dirent.isDirectory())
            return Result.ok({ kind: <const> FolderContentType.Folder, identifier: new StringIdentifier(dirent.name), content: new SystemFolder(path.join(this.path, dirent.name)) });
          else if (dirent.isBlockDevice())
            return Result.err(new UnhandledObjectTypeError(UnhandledObjectTypes.BlockDevice));
          else if (dirent.isCharacterDevice())
            return Result.err(new UnhandledObjectTypeError(UnhandledObjectTypes.CharacterDevice));
          else if (dirent.isSymbolicLink())
            return Result.err(new UnhandledObjectTypeError(UnhandledObjectTypes.SymbolicLink));
          else if (dirent.isFIFO())
            return Result.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Fifo));
          else if (dirent.isSocket())
            return Result.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Socket));
          else
            return Result.err(new UnhandledObjectTypeError(UnhandledObjectTypes.Unknown));
        }));
  }

  createFolder(identifier: StringIdentifier): Future<SystemFolder, NodeJS.ErrnoException> {
    try {
      mkdirSync(path.join(this.path, identifier.toString()));
    } catch(err) {
      return Future.err(err as NodeJS.ErrnoException);
    }

    return Future.ok(new SystemFolder(path.join(this.path, identifier.toString())));
  }

  createFile(identifier: StringIdentifier): Future<SystemFile, NodeJS.ErrnoException> {
    try {
      const fh = openSync(path.join(this.path, identifier.toString()), 'w');

      ftruncateSync(fh, 0);
      closeSync(fh);
    } catch(err) {
      return Future.err(err as NodeJS.ErrnoException);
    }

    return Future.ok(new SystemFile(path.join(this.path, identifier.toString())));
  }
}