import archiver from "archiver";
import { WriteStream, createWriteStream } from "fs";
import { resolve } from "path";
import { PassThrough } from "stream";

export default function archive(
  toFile: boolean = true
): Promise<PassThrough | WriteStream> {
  return new Promise((res, reject) => {
    let outputZip: PassThrough | WriteStream = toFile
      ? createWriteStream(resolve("dist", "output.zip"))
      : new PassThrough();
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    archive.on("error", function (err) {
      reject(err);
    });
    archive.pipe(outputZip);
    archive.glob("**/*", {
      cwd: resolve("dist"),
      ignore: ["output.zip"],
    });
    archive.finalize().then(() => {
      console.log(`Archive created: ${archive.pointer()} total bytes`);
      res(outputZip);
    });
  });
}
