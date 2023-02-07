# safe-html-rewriter
Safe (fault-tolerant) wrapper around [WebAssembly version of Cloudlfare HTMLRewriter][html-rewriter-wasm][^1]

```ts
import { HTMLRewriter, type RewriterHandlers } from "npm:safe-html-rewriter";
import { expandGlob } from "https://deno.land/std/fs/mod.ts";

const rewrite = new HTMLRewriter();

const handler = {
  element(el) { el.remove() }
} satisfies RewriterHandlers

for await (const { path } of expandGlob("your/index.{html,njk,jinja,tmpl}")) {
  const content = await Deno.readTextFile(path);

  rewrite.on('script[src*="unwanted-script"]', handler); // share same handler

  rewrite.on('link[rel="stylesheet",href*="unwanted-css"]', { // single selector with many handlers
    element(el) {
      el.remove()
      console.log(`remove ${el.getAttribute(href)} from ${path}`)
      console.log("--------------------------------------------")
      console.log(content)
      console.log("--------------------------------------------")
    }
  });

  const output = await rewrite.transform(content);
  console.log("\n", path);
  console.log("-------------------------------------------------------------");
  console.log(output);
  console.log("-------------------------------------------------------------");
}
rewrite.off('script[src*="unwanted-script"]', handler); // only remove specific handler
rewrite.off('link[rel="stylesheet",href*="unwanted-css"]'); // remove all handlers for specific selector

rewrite.free(); // remove all handlers and free memory
```

[^1]: https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/

## Why?
[html-rewriter-wasm][] designed to operate on per-chunk basis which is suitable for streaming response.
However, it can be [tricky](https://github.com/cloudflare/html-rewriter-wasm#caveats) when you use it in non-streaming response.
For example, adding another handler after calling `rewriter.write` will give an error.
This package solve that and also give you an easier API.

[html-rewriter-wasm]: https://github.com/cloudflare/html-rewriter-wasm
