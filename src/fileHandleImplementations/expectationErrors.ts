import { StringIdentifier } from "./stringIdentifier";

export class ExpectedFolderFoundFileError extends Error {
  constructor(public path: string) {
    super(`Expected folder, found file: ${path}`);
  }
}

export class ExpectedFileFoundFolderError extends Error {
  constructor(public path: string) {
    super(`Expected file, found folder: ${path}`);
  }
}