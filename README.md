# Power Grid Indicator

A small client-side Mindustry mod that draws your team's power node links on the minimap
and shows a power history chart for any grid you click, so you can see how your grids are laid out and which one is starving.

## Features

- Compact **Power grid** panel in the top-right corner of the fullscreen map (`M` key): eye button toggles the overlay.
  Works alone or next to the sibling mods (Turret Reach Indicator, Effect Area Indicator): their panels stack in one column.
- Power node links drawn on the map, Factorio style: only node-to-node links (laser nodes, large nodes,
  surge towers, beam nodes), not what the nodes power.
- Link color shows the grid's satisfaction: yellow = fully powered, red = starving.
- Click any of your power nodes to open a chart window on the right edge with the grid's history:
  - production (green) and consumption (red) over the last 3 minutes, one point = 1 second average
  - production, consumption, balance (5 s average), satisfaction, battery charge
  - history is recorded for all your grids all the time, so the chart is filled as soon as you click
- Shows on the fullscreen map and on the corner minimap.
- Settings are remembered between games.
- Client-side only (`hidden: true`): works on servers that don't have the mod, and other players don't need it.

## Installation

Requires Mindustry v8 (build 147 or newer).

**Option A: import as zip**

1. Zip the *contents* of the `power-grid-indicator` folder so `mod.hjson` sits at the zip root:
   ```sh
   cd power-grid-indicator && zip -r ../power-grid-indicator.zip mod.hjson scripts
   ```
2. In game: **Mods → Import Mod → Import File** and choose the zip.
3. Restart the game.

**Option B: copy the folder**

Copy the `power-grid-indicator` folder into your Mindustry mods directory and restart:

| OS      | Mods directory                                     |
|---------|----------------------------------------------------|
| Windows | `%AppData%\Mindustry\mods\`                        |
| Linux   | `~/.local/share/Mindustry/mods/`                   |
| macOS   | `~/Library/Application Support/Mindustry/mods/`    |
| Steam   | `<Steam>/steamapps/common/Mindustry/saves/mods/`   |

## Usage

1. Start or join a game and press `M` to open the map.
2. Click the eye button next to **Power grid** (top-right) to turn the overlay on or off.
3. Close the map and click any of your power nodes to open its grid's chart; the X button closes it.

## Files

```
power-grid-indicator/
├── mod.hjson         # mod metadata
└── scripts/main.js   # all the logic
```

## How it works

The mod adds an invisible map marker that the game's own minimap renderer draws each frame,
so links land in the right place at any zoom level without patching the game.
The marker is never added to the saved marker list, so it never ends up in save or map files.
Node links are refreshed twice per second; grid power is sampled every tick and averaged per second.

## Limitations

- Shows only your own team's grids.
- History restarts for a grid when it is split in two (the grid gets a new id).

## License

MIT
