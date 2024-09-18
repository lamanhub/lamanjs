import { PassThrough } from "stream";

const streamToBuffer = (stream: PassThrough) => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => {
      reject(err);
    });
  });
};

export default streamToBuffer;
