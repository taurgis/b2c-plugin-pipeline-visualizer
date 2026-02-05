const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { parsePipeline } = require("../dist/lib/pipelineParser");
const {
  filterByBranch,
  getAvailableBranches,
  toWebviewEdges,
  toWebviewNodes,
} = require("../dist/lib/pipelineHelpers");

const xmlPath = path.join(__dirname, "..", "pipeline_examples", "Order.xml");
const xml = fs.readFileSync(xmlPath, "utf8");
const parsed = parsePipeline(xml, path.basename(xmlPath));

test("getAvailableBranches includes named branch", () => {
  const branches = getAvailableBranches(parsed.nodes);
  assert.ok(branches.includes("History"));
});

test("filterByBranch keeps edges within filtered nodes", () => {
  const result = filterByBranch(parsed.nodes, parsed.edges, "History");
  assert.ok(result.nodes.length > 0);
  assert.ok(result.edges.length > 0);

  const nodeIds = new Set(result.nodes.map((n) => n.id));
  for (const edge of result.edges) {
    assert.ok(nodeIds.has(edge.from), `missing from node ${edge.from}`);
    assert.ok(nodeIds.has(edge.to), `missing to node ${edge.to}`);
  }
});

test("filterByBranch accepts start node label", () => {
  const result = filterByBranch(parsed.nodes, parsed.edges, "Start History");
  assert.ok(result.nodes.length > 0);
  assert.ok(result.edges.length > 0);
});

test("webview mappings preserve counts and strip undefined attributes", () => {
  const nodes = toWebviewNodes(parsed.nodes);
  const edges = toWebviewEdges(parsed.edges);

  assert.equal(nodes.length, parsed.nodes.length);
  assert.equal(edges.length, parsed.edges.length);

  for (const node of nodes) {
    for (const value of Object.values(node.attributes)) {
      assert.notEqual(value, undefined);
    }
  }
});

test("toWebviewEdges maps bendpoint data", () => {
  const edges = [
    {
      from: "a",
      to: "b",
      display: {
        bendPoints: [{ relativeTo: "source", x: 1, y: 2 }],
      },
    },
  ];

  const mapped = toWebviewEdges(edges);
  assert.equal(mapped[0].display.bendPoints[0].relativeTo, "source");
  assert.equal(mapped[0].display.bendPoints[0].x, 1);
});
