import { StringEncoding } from "../enums";
import { ArrayBufferUtils } from "./arrayBufferUtils";
import { Iterator } from "./iterator";
import { Result } from "./result";
import { encode } from "iconv-lite";

export class StringDecodeError extends Error {
  constructor(reason: string, bytes: DataView) {
    super("Failed to decode string: " + reason);
  }
}

export class StringUtils {
  static decode(view: DataView, format: StringEncoding): Result<string, StringDecodeError> {
    switch (format) {
      case StringEncoding.UTF8: return StringUtils.decodeUTF8(view);
      case StringEncoding.UTF16LE: return StringUtils.decodeUTF16LE(view);
      case StringEncoding.UTF16BE: return StringUtils.decodeUTF16BE(view);
      case StringEncoding.ShiftJIS: return StringUtils.decodeShiftJIS(view);
    }
  }

  static encode(str: string, format: StringEncoding): DataView {
    switch (format) {
      case StringEncoding.UTF8: return StringUtils.encodeUTF8(str);
      case StringEncoding.UTF16LE: return StringUtils.encodeUTF16LE(str);
      case StringEncoding.UTF16BE: return StringUtils.encodeUTF16BE(str);
      case StringEncoding.ShiftJIS: return StringUtils.encodeShiftJIS(str);
    }
  }

  static decodeUTF8(view: DataView): Result<string, StringDecodeError> {
    return Result
      .try(() => new TextDecoder("utf-8").decode(view, { stream: true }))
      .mapErr(e => new StringDecodeError(e instanceof Error ? e.message : String(e), view));
  }

  static encodeUTF8(str: string): DataView {
    return ArrayBufferUtils.toDataView(new TextEncoder().encode(str));
  }

  static decodeUTF16LE(view: DataView): Result<string, StringDecodeError> {
    return Result
      .try(() => new TextDecoder("utf-16le").decode(view, { stream: true }))
      .mapErr(e => new StringDecodeError(e instanceof Error ? e.message : String(e), view));
  }

  static encodeUTF16LE(str: string): DataView {
    return ArrayBufferUtils.toDataView(encode(str, "utf16-le"));
  }

  static decodeUTF16BE(view: DataView): Result<string, StringDecodeError> {
    return Result
      .try(() => new TextDecoder("utf-16be").decode(view, { stream: true }))
      .mapErr(e => new StringDecodeError(e instanceof Error ? e.message : String(e), view));
  }

  static encodeUTF16BE(str: string): DataView {
    return ArrayBufferUtils.toDataView(encode(str, "utf16-be"));
  }

  static decodeShiftJIS(view: DataView): Result<string, StringDecodeError> {
    return Result
      .try(() => new TextDecoder("shift-jis").decode(view, { stream: true }))
      .mapErr(e => new StringDecodeError(e instanceof Error ? e.message : String(e), view));
  }

  static encodeShiftJIS(str: string): DataView {
    return ArrayBufferUtils.toDataView(encode(str, "shift-jis"));
  }
}