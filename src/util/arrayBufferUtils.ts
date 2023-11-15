export class ArrayBufferUtils {
  static sumView(dataViews: ArrayBufferView[]): DataView {
    const length = dataViews.reduce((sum, dataView) => sum + dataView.byteLength, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const dataView of dataViews) {
      result.set(new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength), offset);
      offset += dataView.byteLength;
    }
    return new DataView(result.buffer, result.byteOffset, result.byteLength);
  }

  static slice(dataView: DataView, start: number, end: number = dataView.byteLength): DataView {
    return new DataView(dataView.buffer, dataView.byteOffset + start, end - start);
  }

  static slicer(start: number): (dataView: ArrayBufferView) => DataView
  static slicer(start: number, end: number): (dataView: ArrayBufferView) => DataView
  static slicer(...args: number[]) {
    return ArrayBufferUtils.prototype.slicer_bindable.bind(args);
  }

  static toU8Array(dataView: ArrayBufferView): Uint8Array {
    if (dataView instanceof Uint8Array)
      return dataView;

    return new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
  }

  static toDataView(dataView: ArrayBufferView): DataView {
    if (dataView instanceof DataView)
      return dataView;

    return new DataView(dataView.buffer, dataView.byteOffset, dataView.byteLength);
  }

  private slicer_bindable(dataView: DataView) {
    return ArrayBufferUtils.slice(dataView, ...(this as any as [number, number]));
  }

}