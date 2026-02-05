const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  renderPipelineSvg,
  writePipelineImageAsync,
} = require("../dist/lib/imageRender");

const xmlPath = path.join(__dirname, "..", "pipeline_examples", "Order.xml");

test("renderPipelineSvg includes svg structure", () => {
  const svg = renderPipelineSvg({
    inputPath: xmlPath,
    outputPath: "unused.svg",
    background: "#ffffff",
    grid: true,
    padding: 40,
    scale: 1,
  });

  assert.ok(svg.startsWith("<?xml"));
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("<rect x=\"0\" y=\"0\""));
  assert.ok(svg.includes("<path"));
});

test("renderPipelineSvg skips transparent background", () => {
  const svg = renderPipelineSvg({
    inputPath: xmlPath,
    outputPath: "unused.svg",
    background: "transparent",
  });

  assert.ok(!svg.includes("<rect x=\"0\" y=\"0\""));
});

test("renderPipelineSvg applies default background when unset", () => {
  const svg = renderPipelineSvg({
    inputPath: xmlPath,
    outputPath: "unused.svg",
  });

  assert.ok(svg.includes("fill=\"#0b1021\""));
});

test("writePipelineImageAsync writes svg and rejects non-svg", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-svg-"));
  const outputSvg = path.join(tmpDir, "image.svg");

  const written = await writePipelineImageAsync({
    inputPath: xmlPath,
    outputPath: outputSvg,
  });
  assert.ok(fs.existsSync(written));

  await assert.rejects(
    () => writePipelineImageAsync({ inputPath: xmlPath, outputPath: "bad.png" }),
    /Output path must end with \.svg/
  );
});

test("writePipelineImageAsync accepts uppercase extension", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-svg-"));
  const outputSvg = path.join(tmpDir, "image.SVG");

  const written = await writePipelineImageAsync({
    inputPath: xmlPath,
    outputPath: outputSvg,
  });
  assert.ok(fs.existsSync(written));
});
