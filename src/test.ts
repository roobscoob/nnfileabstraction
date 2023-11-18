// import { PartitionFileSystem } from "./demo/pfs0/pfs0";
// import { Endianness, StringEncoding } from "./enums";
// import { StringIdentifier } from "./fileHandleImplementations/stringIdentifier";
// import { SystemFolder } from "./fileHandleImplementations/systemFolder";
// import { ReadOutOfBoundsError } from "./span";
// import { Struct } from "./struct/struct";
// import { StructType, Types } from "./struct/type";
// import { Future } from "./util/future";
// import { Result } from "./util/result";
//
// async function main() {
//   return SystemFolder
//     .at(".")
//     .map(folder => folder.get(new StringIdentifier("demo.nsz")))
//     .map(object => object.expectFile())
//     .map(file => file.open())
//     .map(file => PartitionFileSystem.loadFuture(file))
//     .map(pfs => pfs.get(new StringIdentifier("gfdjkghdkfjghdsfkhgdksjflh.tik")))
//     .map(tik => tik.getStringToNull(0x140, StringEncoding.UTF8))
// }
//
// main()
