const assert = require("node:assert/strict");
const test = require("node:test");

const { parsePipeline } = require("../dist/lib/pipelineParser");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="TestPipe" group="TestGroup">
  <description>Test pipeline</description>
  <branch basename="Main">
    <segment>
      <node>
        <start-node name="Main"/>
        <node-display x="1" y="1"/>
      </node>
      <transition target-path="./+1">
        <transition-display>
          <bend-point relative-to="source" x="1" y="0"/>
          <bend-point relative-to="target" x="-1" y="0"/>
        </transition-display>
      </transition>
    </segment>
    <segment>
      <node>
        <decision-node condition-key="foo"/>
        <node-display x="1" y="1"/>
      </node>
      <simple-transition/>
      <node>
        <end-node name="Done"/>
        <node-display x="1" y="1"/>
      </node>
    </segment>
  </branch>
  <branch basename="Other">
    <segment>
      <node>
        <start-node name="Other"/>
        <node-display x="0" y="0"/>
      </node>
      <transition target-path="/Main.1"/>
    </segment>
  </branch>
</pipeline>`;

test("parsePipeline resolves deferred edges", () => {
  const parsed = parsePipeline(xml, "TestPipe.xml");
  assert.equal(parsed.name, "TestPipe");
  assert.equal(parsed.group, "TestGroup");
  assert.ok(parsed.nodes.length >= 4);

  const edgeTargets = new Map(parsed.edges.map((e) => [e.from, e.to]));
  assert.equal(edgeTargets.get("Main:0:0"), "Main:1:0");
  assert.equal(edgeTargets.get("Other:0:0"), "Main:1:0");

  const deferredEdge = parsed.edges.find((e) => e.from === "Main:0:0");
  assert.ok(deferredEdge);
  assert.ok(deferredEdge.display);
  assert.equal(deferredEdge.display.bendPoints.length, 2);
});

test("parsePipeline throws when missing pipeline", () => {
  assert.throws(() => parsePipeline("<root></root>"), /Missing <pipeline>/);
});

test("parsePipeline captures node types and attributes", () => {
  const typesXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="Types">
  <branch basename="Main">
    <segment>
      <node><start-node name="Main"/></node>
      <simple-transition/>
      <node>
        <pipelet-node pipelet-name="Assign" pipelet-set-identifier="set">
          <config-property key="foo" value="bar"/>
          <key-binding key="From_0" alias="X"/>
        </pipelet-node>
      </node>
      <simple-transition/>
      <node><call-node start-name-ref="Next"/></node>
      <simple-transition/>
      <node><jump-node start-name-ref="Jump"/></node>
      <simple-transition/>
      <node>
        <interaction-node>
          <template name="tmpl" buffered="true" dynamic="false"/>
        </interaction-node>
      </node>
      <simple-transition/>
      <node><decision-node condition-key="cond"/></node>
      <simple-transition/>
      <node><join-node/></node>
      <simple-transition/>
      <node><loop-node iterator-key="Items"/></node>
      <simple-transition/>
      <node><text-node><description>Hello</description></text-node></node>
      <simple-transition/>
      <node><end-node name="Done"/></node>
    </segment>
  </branch>
</pipeline>`;

  const parsed = parsePipeline(typesXml, "Types.xml");
  const types = parsed.nodes.map((node) => node.type);

  assert.ok(types.includes("start"));
  assert.ok(types.includes("pipelet"));
  assert.ok(types.includes("call"));
  assert.ok(types.includes("jump"));
  assert.ok(types.includes("interaction"));
  assert.ok(types.includes("decision"));
  assert.ok(types.includes("join"));
  assert.ok(types.includes("loop"));
  assert.ok(types.includes("text"));
  assert.ok(types.includes("end"));

  const pipelet = parsed.nodes.find((node) => node.type === "pipelet");
  assert.equal(pipelet.configProperties.length, 1);
  assert.equal(pipelet.bindings.length, 1);
});

test("parsePipeline creates loop back edge for nested branches", () => {
  const loopXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="LoopTest">
  <branch basename="Main">
    <segment>
      <node>
        <loop-node iterator-key="Items"/>
        <branch basename="Inner" source-connector="do">
          <transition target-connector="in"/>
          <segment>
            <node><pipelet-node pipelet-name="Do"/></node>
            <transition target-connector="loop" target-path="../+0"/>
          </segment>
        </branch>
      </node>
    </segment>
  </branch>
</pipeline>`;

  const parsed = parsePipeline(loopXml, "LoopTest.xml");
  const loopNode = parsed.nodes.find((node) => node.type === "loop");
  const innerNode = parsed.nodes.find((node) => node.type === "pipelet");
  assert.ok(loopNode && innerNode);

  const loopEdge = parsed.edges.find(
    (edge) => edge.from === innerNode.id && edge.to === loopNode.id
  );
  assert.ok(loopEdge);
  assert.equal(loopEdge.label, "loop");
});

test("parsePipeline resolves parent-relative target paths", () => {
  const relativeXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="Relative">
  <branch basename="Main">
    <segment>
      <node>
        <start-node name="Main"/>
        <branch basename="Inner">
          <segment>
            <node><pipelet-node pipelet-name="Do"/></node>
            <transition target-path="../+0"/>
          </segment>
        </branch>
      </node>
    </segment>
  </branch>
</pipeline>`;

  const parsed = parsePipeline(relativeXml, "Relative.xml");
  const innerNode = parsed.nodes.find((node) => node.type === "pipelet");
  const startNode = parsed.nodes.find((node) => node.type === "start");
  assert.ok(innerNode && startNode);

  const edge = parsed.edges.find((e) => e.from === innerNode.id);
  assert.ok(edge);
  assert.equal(edge.to, startNode.id);
});

test("parsePipeline uses filename when name is missing", () => {
  const unnamedXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline>
  <branch basename="Main">
    <segment>
      <node><start-node name="Main"/></node>
    </segment>
  </branch>
</pipeline>`;

  const parsed = parsePipeline(unnamedXml, "NoName.xml");
  assert.equal(parsed.name, "NoName");
});

test("parsePipeline ignores invalid bendpoints", () => {
  const invalidBendXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="InvalidBend">
  <branch basename="Main">
    <segment>
      <node><start-node name="Main"/></node>
      <transition>
        <transition-display>
          <bend-point relative-to="center" x="1" y="1"/>
        </transition-display>
      </transition>
      <node><end-node name="Done"/></node>
    </segment>
  </branch>
</pipeline>`;

  const parsed = parsePipeline(invalidBendXml, "InvalidBend.xml");
  const edge = parsed.edges.find((e) => e.from.endsWith(":0:0"));
  assert.ok(edge);
  assert.equal(edge.display, undefined);
});

test("parsePipeline handles unknown and missing display", () => {
  const unknownXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="Unknown">
  <branch basename="Main">
    <segment>
      <node><custom-node foo="bar"/></node>
      <simple-transition/>
      <node><interaction-node/></node>
      <simple-transition/>
      <node>
        <text-node>
          <description>${"x".repeat(80)}</description>
        </text-node>
      </node>
    </segment>
  </branch>
</pipeline>`;

  const parsed = parsePipeline(unknownXml, "Unknown.xml");
  const unknownNode = parsed.nodes.find((node) => node.label === "custom-node");
  assert.equal(unknownNode.type, "unknown");

  const interaction = parsed.nodes.find((node) => node.type === "interaction");
  assert.equal(interaction.label, "Interaction");

  const textNode = parsed.nodes.find((node) => node.type === "text");
  assert.ok(textNode.label.length <= 60);
});

test("parsePipeline handles invalid node-display numbers", () => {
  const displayXml = `<?xml version="1.0" encoding="UTF-8"?>
<pipeline name="Display">
  <branch basename="Main">
    <segment>
      <node>
        <start-node name="Main"/>
        <node-display x="abc" y="-2" width="NaN" orientation="left"/>
      </node>
    </segment>
  </branch>
</pipeline>`;

  const parsed = parsePipeline(displayXml, "Display.xml");
  const start = parsed.nodes[0];
  assert.equal(start.position.x, undefined);
  assert.equal(start.position.width, undefined);
  assert.equal(start.position.orientation, "left");
});
