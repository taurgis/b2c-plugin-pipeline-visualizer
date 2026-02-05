"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const asciiDump_1 = require("../../lib/asciiDump");
class PipelineAscii extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(PipelineAscii);
        const result = (0, asciiDump_1.generateAsciiDump)({
            inputPath: args.input,
            cellWidth: flags.cellWidth,
            includeGrid: flags.grid,
            includeNodes: flags.nodes,
            includeEdges: flags.edges,
            showBendpoints: flags.showBendpoints,
            includeFullLayout: flags.fullLayout,
            branch: flags.branch,
        });
        const outputPath = (0, asciiDump_1.writeDumpToFile)(result, flags.out);
        this.log(`Layout written to ${outputPath}`);
        if (result.branch) {
            this.log(`Filtered to branch: ${result.branch} (${result.nodes.length} nodes, ${result.edges.length} edges)`);
        }
    }
}
PipelineAscii.description = "Generate an ASCII preview from a pipeline XML file and save it to a file.";
PipelineAscii.longDescription = "By default, only the coarse full layout section is included. Add --grid, --nodes, or --edges to include those sections. Use --show-bendpoints with --edges to debug XML bendpoints.";
PipelineAscii.examples = [
    "b2c pipeline ascii pipeline_examples/Cart.xml --out debug/layouts/Cart.txt",
    "b2c pipeline ascii pipeline_examples/Order.xml --out debug/layouts/Order.txt --branch Checkout",
    "b2c pipeline ascii pipeline_examples/Order.xml --out debug/layouts/Order.txt --edges --show-bendpoints",
    "b2c pipeline ascii pipeline_examples/Order.xml --out debug/layouts/Order.txt --grid --nodes --no-full-layout",
];
PipelineAscii.args = {
    input: core_1.Args.string({
        description: "Path to the pipeline XML file",
        required: true,
    }),
};
PipelineAscii.flags = {
    out: core_1.Flags.string({
        char: "o",
        description: "Output file path (required)",
        required: true,
    }),
    cellWidth: core_1.Flags.integer({
        char: "w",
        description: "Grid cell label width (wider keeps more text)",
        default: 18,
    }),
    grid: core_1.Flags.boolean({
        description: "Include the grid section",
        default: false,
    }),
    nodes: core_1.Flags.boolean({
        description: "Include the node list section",
        default: false,
    }),
    edges: core_1.Flags.boolean({
        description: "Include the edge list section",
        default: false,
    }),
    showBendpoints: core_1.Flags.boolean({
        description: "Include bendpoint details in the edge list",
        default: false,
    }),
    fullLayout: core_1.Flags.boolean({
        char: "F",
        description: "Include the coarse full layout section",
        default: true,
        allowNo: true,
    }),
    branch: core_1.Flags.string({
        char: "b",
        description: "Filter by branch name or start node name (includes sub-branches)",
    }),
};
exports.default = PipelineAscii;
