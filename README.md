# B2C Plugin: Pipeline Visualizer (ASCII)

Generate an ASCII preview of SFCC pipeline XML files using the B2C CLI plugin system.

## Install (local development)

```bash
npm install
npm run build
b2c plugins link /path/to/b2c-plugin-pipeline-visualizer
```

Verify:

```bash
b2c plugins
```

## Usage

```bash
b2c pipeline ascii path/to/pipeline.xml --out debug/layouts/pipeline.txt
```

Output is always written to the file specified by `--out`.

Options:

- `-o, --out <path>`: Output file path (required).
- `-w, --cell-width <n>`: Grid cell label width (default: 18).
- `--grid`: Include the grid section.
- `--nodes`: Include the node list section.
- `--edges`: Include the edge list section.
- `--show-bendpoints`: Include bendpoint details in the edge list.
- `-F, --full-layout`: Include the coarse ASCII layout view (default).
- `--no-full-layout`: Disable the coarse ASCII layout view.
- `-b, --branch <name>`: Filter by branch name or start node name.

## Image Export

```bash
b2c pipeline image path/to/pipeline.xml --out debug/layouts/pipeline.svg
b2c pipeline image path/to/pipeline.xml --out debug/layouts/pipeline.png
```

Options:

- `-o, --out <path>`: Output file path (required, .svg or .png).
- `-b, --branch <name>`: Filter by branch name or start node name.
- `-s, --scale <n>`: Scale factor for SVG dimensions.
- `-p, --padding <n>`: Padding around the rendered pipeline in pixels.
- `--background <color>`: Background color (use `transparent` for none).
- `--grid`: Include the background grid.
- `--show-bendpoints`: Render bendpoint indicators on edges.

## Notes

- This plugin adds a new command, `pipeline ascii`.
- The ASCII output uses the same layout and edge routing logic as the visualizer.

## Unlink

```bash
b2c plugins unlink b2c-plugin-pipeline-visualizer
```
