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

  #isFlushed = true;
  #cache = new Map<string, [cf.ElementHandlers, ElementHandlers]>();
  #rewrite?: cf.HTMLRewriter;
  #mayReconstruct() {
    if (this.#isFlushed) {
      this.#rewrite?.free();
      this.#rewrite = new cf.HTMLRewriter(
        (chunk) => this.#output += HTMLRewriter.#string.decode(chunk),
        { enableEsiTags: false },
      );
      this.#cache.forEach(([handle], selector) =>
        this.#rewrite!.on(selector, handle)
      );
      this.#isFlushed = false;
    }
  }

  free() {
    this.#rewrite?.free();
    this.#cache.clear();
  }

  on(selector: string, handlers: cf.ElementHandlers) {
    let notCached: [cf.ElementHandlers, ElementHandlers] | undefined;
    const [handle, list] = this.#cache.get(selector) ??
      (this.#cache.set(selector, notCached = [{}, {}]), notCached);
    for (const h in handlers) { // @ts-ignore: current typescript can't infer this
      (list[h] ??= new Set()).add(handlers[h]); // @ts-ignore: current typescript can't infer this
      handle[h] ??= (...args) => list[h].forEach((handle) => handle(...args));
    }
    this.#mayReconstruct();
    if (notCached) this.#rewrite!.on(selector, handle!);
    return this;
  }

  async transform(input: string) {
    this.#mayReconstruct();
    await this.#rewrite!.write(HTMLRewriter.#string.encode(input));
    this.#isFlushed = true;
    const result: string = this.#output;
    await this.#reset();
    return result;
  }
  async #reset() {
    await this.#rewrite!.end();
    this.#output = "";
  }
}

type ElementHandlers = {
  [K in keyof cf.ElementHandlers]: Set<cf.ElementHandlers[K]>;
};
