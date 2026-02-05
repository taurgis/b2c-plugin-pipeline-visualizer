import { Args, Command, Flags } from "@oclif/core";
import { generateAsciiDump, writeDumpToFile } from "../../lib/asciiDump";

export default class PipelineAscii extends Command {
  static description =
    "Generate an ASCII preview from a pipeline XML file and save it to a file.";

  static longDescription =
    "By default, only the coarse full layout section is included. Add --grid, --nodes, or --edges to include those sections. Use --show-bendpoints with --edges to debug XML bendpoints.";

  static examples = [
    "b2c pipeline ascii pipeline_examples/Cart.xml --out debug/layouts/Cart.txt",
    "b2c pipeline ascii pipeline_examples/Order.xml --out debug/layouts/Order.txt --branch Checkout",
    "b2c pipeline ascii pipeline_examples/Order.xml --out debug/layouts/Order.txt --edges --show-bendpoints",
    "b2c pipeline ascii pipeline_examples/Order.xml --out debug/layouts/Order.txt --grid --nodes --no-full-layout",
  ];

  static args = {
    input: Args.string({
      description: "Path to the pipeline XML file",
      required: true,
    }),
  };

  static flags = {
    out: Flags.string({
      char: "o",
      description: "Output file path (required)",
      required: true,
    }),
    cellWidth: Flags.integer({
      char: "w",
      description: "Grid cell label width (wider keeps more text)",
      default: 18,
    }),
    grid: Flags.boolean({
      description: "Include the grid section",
      default: false,
    }),
    nodes: Flags.boolean({
      description: "Include the node list section",
      default: false,
    }),
    edges: Flags.boolean({
      description: "Include the edge list section",
      default: false,
    }),
    showBendpoints: Flags.boolean({
      description: "Include bendpoint details in the edge list",
      default: false,
    }),
    fullLayout: Flags.boolean({
      char: "F",
      description: "Include the coarse full layout section",
      default: true,
      allowNo: true,
    }),
    branch: Flags.string({
      char: "b",
      description: "Filter by branch name or start node name (includes sub-branches)",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(PipelineAscii);

    const result = generateAsciiDump({
      inputPath: args.input,
      cellWidth: flags.cellWidth,
      includeGrid: flags.grid,
      includeNodes: flags.nodes,
      includeEdges: flags.edges,
      showBendpoints: flags.showBendpoints,
      includeFullLayout: flags.fullLayout,
      branch: flags.branch,
    });

    const outputPath = writeDumpToFile(result, flags.out);
    this.log(`Layout written to ${outputPath}`);
    if (result.branch) {
      this.log(
        `Filtered to branch: ${result.branch} (${result.nodes.length} nodes, ${result.edges.length} edges)`
      );
    }
  }
}
