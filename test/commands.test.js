const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PipelineAscii = require("../dist/commands/pipeline/ascii").default;
const PipelineImage = require("../dist/commands/pipeline/image").default;

const xmlPath = path.join(__dirname, "..", "pipeline_examples", "Order.xml");

test("pipeline ascii command writes output", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-cli-"));
  const outputPath = path.join(tmpDir, "out.txt");

  await PipelineAscii.run([xmlPath, "--out", outputPath]);
  assert.ok(fs.existsSync(outputPath));
});

test("pipeline image command writes svg", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-cli-"));
  const outputPath = path.join(tmpDir, "out.svg");

  await PipelineImage.run([xmlPath, "--out", outputPath, "--scale", "1"]);
  const contents = fs.readFileSync(outputPath, "utf8");
  assert.ok(contents.includes("<svg"));
});
