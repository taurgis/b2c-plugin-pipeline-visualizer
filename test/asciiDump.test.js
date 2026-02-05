const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { generateAsciiDump, writeDumpToFile } = require("../dist/lib/asciiDump");

const xmlPath = path.join(__dirname, "..", "pipeline_examples", "Order.xml");

test("generateAsciiDump renders expected sections", () => {
  const result = generateAsciiDump({
    inputPath: xmlPath,
    includeGrid: true,
    includeNodes: true,
    includeEdges: true,
    includeFullLayout: true,
    showBendpoints: true,
    branch: "History",
    cellWidth: 16,
  });

  assert.ok(result.ascii.includes("Pipeline: Order (branch: History)"));
  assert.ok(result.ascii.includes("Grid (x left->right, y top->bottom):"));
  assert.ok(result.ascii.includes("Nodes (ordered by grid row):"));
  assert.ok(result.ascii.includes("Edges:"));
  assert.ok(result.ascii.includes("Full layout"));
  assert.match(result.ascii, /\n\nGrid \(x left->right/);
});

test("generateAsciiDump throws on missing branch", () => {
  assert.throws(
    () => generateAsciiDump({ inputPath: xmlPath, branch: "NoSuchBranch" }),
    /No nodes found for branch/
  );
});

test("generateAsciiDump includes edges when bendpoints requested", () => {
  const result = generateAsciiDump({
    inputPath: xmlPath,
    showBendpoints: true,
    includeEdges: false,
  });

  assert.ok(result.ascii.includes("Edges:"));
});

test("writeDumpToFile writes output", () => {
  const result = generateAsciiDump({ inputPath: xmlPath, includeEdges: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-ascii-"));
  const outputPath = path.join(tmpDir, "dump.txt");

  const written = writeDumpToFile(result, outputPath);
  const contents = fs.readFileSync(written, "utf8");

  assert.ok(contents.includes("Pipeline:"));
  assert.ok(written.endsWith("dump.txt"));
});

test("writeDumpToFile uses default output when omitted", () => {
  const result = generateAsciiDump({ inputPath: xmlPath, includeEdges: true });
  const written = writeDumpToFile(result);
  assert.ok(written.endsWith(".txt"));
  assert.ok(fs.existsSync(written));
});

test("generateAsciiDump handles empty pipelines", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-ascii-"));
  const emptyPath = path.join(tmpDir, "empty.xml");
  const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="Empty">
  <branch basename="Main">
    <segment></segment>
  </branch>
</pipeline>`;

  fs.writeFileSync(emptyPath, emptyXml, "utf8");

  const result = generateAsciiDump({
    inputPath: emptyPath,
    includeGrid: true,
    includeNodes: true,
    includeEdges: true,
    includeFullLayout: true,
  });

  assert.ok(result.ascii.includes("Pipeline: Empty"));
  assert.ok(result.ascii.includes("(no nodes)"));
  assert.ok(result.ascii.includes("(no edges)"));
});
