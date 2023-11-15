import { AsyncReadableSpan, SyncReadableSpan } from "./span";
import { Future } from "./util/future";
import { Result } from "./util/result";

export abstract class File<OpenErrors, MetadataErrors, SpanType extends SyncReadableSpan, MetadataType> {
  abstract open(): Result<SpanType, OpenErrors>;
  abstract getMetadata(): Result<MetadataType, MetadataErrors>;
}

export abstract class AsyncFile<OpenErrors, MetadataErrors, SpanType extends AsyncReadableSpan, MetadataType> {
  abstract open(): Future<SpanType, OpenErrors>;
  abstract getMetadata(): Future<MetadataType, MetadataErrors>;
}