const test = require("node:test");

test("module smoke imports", () => {
  require("../dist/index");
  require("../dist/lib/types");
  require("../dist/webview-ui/types");
  require("../dist/webview-ui/edges");
});
