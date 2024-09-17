export default function errorPage(code: number) {
  throw new Error(`${code}`);
}
