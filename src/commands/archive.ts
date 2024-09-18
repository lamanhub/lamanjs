import archiver from "archiver";
import { WriteStream, createWriteStream } from "fs";
import { resolve } from "path";
import { PassThrough } from "stream";
import progress from "../utils/progress.js";

export default function archive(
  output: PassThrough | WriteStream
): Promise<void> {
  return new Promise<void>((res, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    const loader = progress("Archiving");
    archive.on("error", function (err) {
      reject(err);
    });
    archive.on("finish", function () {
      loader.succeed(`Archive created: ${archive.pointer()} total bytes`);
      res();
    });
    archive.on("progress", (data) => {
      loader.load(`${data.entries.total} bytes`);
    });
    archive.glob("**/*", {
      cwd: resolve("dist"),
      ignore: ["output.zip"],
    });
    archive.pipe(output);
    archive.finalize();
  });
}
