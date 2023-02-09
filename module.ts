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

  #isFlushed = false;
  #cache = new Map<string, [cf.ElementHandlers, ElementHandlers]>();
  #new = () =>
    new cf.HTMLRewriter(
      (chunk) => this.#output += HTMLRewriter.#string.decode(chunk),
      { enableEsiTags: false },
    );
  #rewrite = this.#new();
  #mayReconstruct() {
    const yes = this.#isFlushed;
    if (yes) {
      this.#rewrite.free();
      this.#rewrite = this.#new();
      this.#isFlushed = false;
    }
    return yes;
  }
  #reinstate() {
    this.#cache.forEach(([handle], selector) =>
      this.#rewrite.on(selector, handle)
    );
  }

  free() {
    this.#rewrite.free();
    this.#cache.clear();
  }

  off(selector: string, handlers?: cf.ElementHandlers) {
    if (handlers) {
      const [handle, list] = this.#cache.get(selector)!;
      for (const h in handlers) {
        type H = keyof typeof handlers;
        const lh = list[h as H]; // @ts-ignore: typescript can't infer handlers[h]
        lh?.delete(handlers[h as H]);
        if (lh?.size === 0) {
          delete list[h as H];
          delete handle[h as H];
        }
      }
      if (Object.keys(handle).length === 0) this.#cache.delete(selector);
    } else this.#cache.delete(selector);
    return this;
  }

  on(selector: string, handlers: cf.ElementHandlers) {
    let notCached: [cf.ElementHandlers, ElementHandlers] | undefined;
    const [handle, list] = this.#cache.get(selector) ??
      (this.#cache.set(selector, notCached = [{}, {}]), notCached);
    for (const h in handlers) { // @ts-ignore: current typescript can't infer this
      (list[h] ??= new Set()).add(handlers[h]); // @ts-ignore: current typescript can't infer this
      handle[h] ??= (...args) => list[h].forEach((handle) => handle(...args));
    }
    if (this.#mayReconstruct() || notCached) {
      this.#rewrite.on(selector, handle!);
    }
    return this;
  }

  async transform(input: string) {
    if (this.#mayReconstruct()) this.#reinstate();
    await this.#rewrite.write(HTMLRewriter.#string.encode(input));
    this.#isFlushed = true;
    const result: string = this.#output;
    await this.#reset();
    return result;
  }
  async #reset() {
    await this.#rewrite.end();
    this.#output = "";
  }
}

type ElementHandlers = {
  [K in keyof cf.ElementHandlers]: Set<cf.ElementHandlers[K]>;
};
