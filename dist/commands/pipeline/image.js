"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const imageRender_1 = require("../../lib/imageRender");
class PipelineImage extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(PipelineImage);
        const outputPath = await (0, imageRender_1.writePipelineImageAsync)({
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
PipelineImage.description = "Render a pipeline image using the same layout and routing as the webview.";
PipelineImage.longDescription = "Exports an SVG or PNG image based on the output file extension. Use --grid to include the background grid and --show-bendpoints to show forced routing points.";
PipelineImage.examples = [
    "b2c pipeline image pipeline_examples/Cart.xml --out debug/layouts/Cart.svg",
    "b2c pipeline image pipeline_examples/Cart.xml --out debug/layouts/Cart.png",
    "b2c pipeline image pipeline_examples/Order.xml --out debug/layouts/Order.svg --branch Checkout",
    "b2c pipeline image pipeline_examples/Mail.xml --out debug/layouts/Mail.png --grid",
];
PipelineImage.args = {
    input: core_1.Args.string({
        description: "Path to the pipeline XML file",
        required: true,
    }),
};
PipelineImage.flags = {
    out: core_1.Flags.string({
        char: "o",
        description: "Output file path (required, .svg or .png)",
        required: true,
    }),
    branch: core_1.Flags.string({
        char: "b",
        description: "Filter by branch name or start node name (includes sub-branches)",
    }),
    scale: core_1.Flags.integer({
        char: "s",
        description: "Scale factor applied to the SVG dimensions",
        default: 1,
    }),
    padding: core_1.Flags.integer({
        char: "p",
        description: "Padding around the rendered pipeline in pixels",
        default: 80,
    }),
    background: core_1.Flags.string({
        description: "Background color (use 'transparent' for none)",
    }),
    grid: core_1.Flags.boolean({
        description: "Include the background grid",
        default: false,
    }),
    showBendpoints: core_1.Flags.boolean({
        description: "Render bendpoint indicators on edges",
        default: false,
    }),
};
exports.default = PipelineImage;
