import { Args, Command, Flags } from "@oclif/core";
import { writePipelineImageAsync } from "../../lib/imageRender";

export default class PipelineImage extends Command {
  static description =
    "Render a pipeline image using the same layout and routing as the webview.";

  static longDescription =
    "Exports an SVG or PNG image based on the output file extension. Use --grid to include the background grid and --show-bendpoints to show forced routing points.";

  static examples = [
    "b2c pipeline image pipeline_examples/Cart.xml --out debug/layouts/Cart.svg",
    "b2c pipeline image pipeline_examples/Cart.xml --out debug/layouts/Cart.png",
    "b2c pipeline image pipeline_examples/Order.xml --out debug/layouts/Order.svg --branch Checkout",
    "b2c pipeline image pipeline_examples/Mail.xml --out debug/layouts/Mail.png --grid",
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
      description: "Output file path (required, .svg or .png)",
      required: true,
    }),
    branch: Flags.string({
      char: "b",
      description: "Filter by branch name or start node name (includes sub-branches)",
    }),
    scale: Flags.integer({
      char: "s",
      description: "Scale factor applied to the SVG dimensions",
      default: 1,
    }),
    padding: Flags.integer({
      char: "p",
      description: "Padding around the rendered pipeline in pixels",
      default: 80,
    }),
    background: Flags.string({
      description: "Background color (use 'transparent' for none)",
    }),
    grid: Flags.boolean({
      description: "Include the background grid",
      default: false,
    }),
    showBendpoints: Flags.boolean({
      description: "Render bendpoint indicators on edges",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(PipelineImage);

    const outputPath = await writePipelineImageAsync({
      inputPath: args.input,
      outputPath: flags.out,
      branch: flags.branch,
      scale: flags.scale,
      padding: flags.padding,
      background: flags.background,
      grid: flags.grid,
      showBendpoints: flags.showBendpoints,
    });

    this.log(`Image written to ${outputPath}`);
  }
}
