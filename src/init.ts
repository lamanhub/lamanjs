import { cp } from "fs";
import { resolve } from "path";

export default async function init() {
  await cp(
    resolve("node_modules", "@lamanhub/laman-cli", "example"),
    resolve(),
    {
      recursive: true,
    },
    () => {}
  );
}
