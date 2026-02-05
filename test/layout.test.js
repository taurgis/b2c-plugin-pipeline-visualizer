const assert = require("node:assert/strict");
const test = require("node:test");

const {
  calculateLayout,
  buildNodeMap,
  calculateBounds,
} = require("../dist/webview-ui/layout");
const { LAYOUT_CONFIG } = require("../dist/webview-ui/constants");

function makeNode(id, x, y, branch = "Main", type = "start") {
  return {
    id,
    label: id,
    type,
    branch,
    attributes: {},
    configProperties: [],
    bindings: [],
    template: null,
    description: null,
    position: { x, y },
  };
}

test("calculateLayout preserves grid when requested", () => {
  const nodes = [
    makeNode("Main:0:0", 1, 1),
    makeNode("Main:0:1", 0, 1, "Main", "pipelet"),
  ];

  const placed = calculateLayout(nodes, { preserveGrid: true });
  assert.equal(placed.length, 2);

  for (const node of placed) {
    assert.notEqual(node.gridX, undefined);
    assert.notEqual(node.gridY, undefined);

    const expectedX = LAYOUT_CONFIG.baseX + node.gridX * LAYOUT_CONFIG.horizontalGap;
    const expectedY = LAYOUT_CONFIG.baseY + node.gridY * LAYOUT_CONFIG.verticalGap;
    assert.equal(node.x, expectedX);
    assert.equal(node.y, expectedY);
  }
});

test("buildNodeMap and calculateBounds return expected values", () => {
  const nodes = [
    makeNode("Main:0:0", 0, 0),
    makeNode("Main:0:1", 1, 1, "Main", "end"),
  ];

  const placed = calculateLayout(nodes);
  const nodeMap = buildNodeMap(placed);
  const bounds = calculateBounds(placed);

  assert.ok(nodeMap["Main:0:0"]);
  assert.ok(bounds.maxX > LAYOUT_CONFIG.baseX);
  assert.ok(bounds.maxY > LAYOUT_CONFIG.baseY);
});

test("calculateLayout offsets nested branch from parent", () => {
  const nodes = [
    makeNode("Main:0:0", 1, 1),
    makeNode("Main:0:1", 0, 1, "Main", "pipelet"),
    makeNode("Main:0:0/Child:0:0", 1, 0, "Main:0:0/Child", "pipelet"),
  ];

  const placed = calculateLayout(nodes, { preserveGrid: true });
  const parent = placed.find((node) => node.id === "Main:0:0");
  const child = placed.find((node) => node.id === "Main:0:0/Child:0:0");

  assert.ok(parent && child);
  assert.equal(child.gridX, parent.gridX + 1);
  assert.equal(child.gridY, parent.gridY + 0);
});

test("calculateLayout drops grid when preserveGrid is false", () => {
  const nodes = [
    makeNode("Main:0:0", 1, 1),
    makeNode("Main:0:1", 0, 1, "Main", "pipelet"),
  ];

  const placed = calculateLayout(nodes, { preserveGrid: false });
  for (const node of placed) {
    assert.equal(node.gridX, undefined);
    assert.equal(node.gridY, undefined);
  }
});

test("calculateLayout falls back when parent is missing", () => {
  const nodes = [
    makeNode("Main:0:0/Orphan:0:0", 3, 2, "Main:0:0/Orphan", "pipelet"),
  ];

  const placed = calculateLayout(nodes, { preserveGrid: true });
  assert.equal(placed[0].gridX, 3);
  assert.equal(placed[0].gridY, 2);
});

test("calculateLayout uses previous node offsets", () => {
  const nodes = [
    makeNode("Main:0:0", 1, 1),
    makeNode("Main:0:1", 1, 0, "Main", "pipelet"),
    makeNode("Main:0:2", -1, 1, "Main", "pipelet"),
  ];

  const placed = calculateLayout(nodes, { preserveGrid: true });
  assert.equal(placed[1].gridX, placed[0].gridX + 1);
  assert.equal(placed[1].gridY, placed[0].gridY + 0);
  assert.equal(placed[2].gridX, placed[1].gridX - 1);
  assert.equal(placed[2].gridY, placed[1].gridY + 1);
});

test("calculateLayout normalizes negative grid values", () => {
  const nodes = [
    makeNode("Main:0:0", -2, -1),
    makeNode("Main:0:1", 1, 0, "Main", "pipelet"),
  ];

  const placed = calculateLayout(nodes, { preserveGrid: true });
  assert.ok(placed[0].gridX >= 0);
  assert.ok(placed[0].gridY >= 0);
});

test("calculateLayout falls back on errors", () => {
  const badNode = {
    id: "Bad:0:0",
    label: "Bad",
    type: "start",
    branch: "Bad",
    attributes: {},
    configProperties: [],
    bindings: [],
    template: null,
    description: null,
    get position() {
      throw new Error("boom");
    },
  };

  const placed = calculateLayout([badNode]);
  assert.equal(placed.length, 1);
  assert.ok(Number.isFinite(placed[0].x));
  assert.ok(Number.isFinite(placed[0].y));
});
