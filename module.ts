class USVString {
  #encoder = new TextEncoder();
  #decoder = new TextDecoder();
  decode = (input: BufferSource, options?: TextDecodeOptions) =>
    this.#decoder.decode(input, options);
  encode = (input: string) => this.#encoder.encode(input);
}

export type { ElementHandlers } from "html-rewriter-wasm";
import * as cf from "html-rewriter-wasm";

export class HTMLRewriter {
  static #string = new USVString();
  #output = "";

  #rewrite = new cf.HTMLRewriter(
    (chunk) => this.#output += HTMLRewriter.#string.decode(chunk),
    { enableEsiTags: false },
  );
  free() {
    this.#rewrite.free();
  }

  on(selector: string, handlers: cf.ElementHandlers) {
    this.#rewrite!.on(selector, handlers);
    return this;
  }

  async transform(input: string) {
    await this.#rewrite.write(HTMLRewriter.#string.encode(input));
    const result: string = this.#output;
    await this.#reset();
    return result;
  }
  async #reset() {
    await this.#rewrite.end();
    this.#output = "";
  }
}
