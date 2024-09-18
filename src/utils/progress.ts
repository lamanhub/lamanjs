import { cursorTo, clearLine } from "readline";

export default function progress(text: string) {
  return {
    load: (loaded?: string) => {
      cursorTo(process.stdout, 0);
      clearLine(process.stdout, 0);
      cursorTo(process.stdout, 0);
      process.stdout.write(`${text} => ${loaded}`);
    },
    succeed: (text: string) => {
      cursorTo(process.stdout, 0);
      clearLine(process.stdout, 0);
      cursorTo(process.stdout, 0);
      process.stdout.write(text + "\n");
    },
  };
}
