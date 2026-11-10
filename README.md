# Power Grid Indicator

A client-side Mindustry mod that shows your team's power grids on the map,
so you can see at a glance how your grids are laid out and which one is starving.

<img src="preview.png" alt="Power node links drawn on the map, one grid powered and one starving" width="256">

## Features

- **Node links on the map**, Factorio style: only node-to-node links (laser nodes, large nodes,
  surge towers, beam nodes), not every block the nodes power.
- **Grid satisfaction by color**: yellow = fully powered, red = starving.
- **Grid chart**: click any of your power nodes to open a window on the right edge with its grid's history:

  | Line        | Shows                                                       |
  |-------------|-------------------------------------------------------------|
  | Production  | power produced, last 3 minutes, one point = 1 second average |
  | Consumption | power used, same scale                                       |
  | Text below  | production, consumption, balance (5 s average), satisfaction, battery charge |

- History is recorded for all your grids all the time, so the chart is filled as soon as you click.
- Works on the fullscreen map and the corner minimap.
- Works alone or together with the sibling mods [Turret Reach Indicator](https://github.com/TousTarm/Mindustry_turret_reach_indicator_mod)
  and [Effect Area Indicator](https://github.com/TousTarm/Mindustry_effects_area_indicator_mod): their panels stack in one column.
- Settings are remembered between games.
- **Client-side only.** Works on any server, including ones without the mod. Other players don't need it.

## Installation

Requires Mindustry v8 (build 147 or newer).

**From GitHub (in game)**

1. **Mods → Import Mod → Import From GitHub**
2. Enter `TousTarm/Mindustry_electric_grid_indicator_mod`
3. Restart the game.

**From a zip file**

1. On GitHub, click **Code → Download ZIP**.
2. In game: **Mods → Import Mod → Import File** and pick the downloaded zip.
3. Restart the game.

## Usage

1. Start or join a game and press `M` to open the map.
2. Click the eye button next to **Power grid** (top-right corner) to show or hide the node links.
3. Close the map and click any of your power nodes to open its grid's chart; the X button closes it.

## Performance and safety

- Node links are checked twice per second. Grid power is sampled every tick and averaged per second,
  keeping at most 3 minutes of numbers per grid.
- The mod makes no network requests, reads or writes no files, and only stores its own setting (`pgi-enabled`).
- The overlay is drawn through an in-memory map marker that is never added to the saved marker list,
  so it never ends up in save files, maps, or data sent to other players.

## Limitations

- Shows only your own team's grids.
- History restarts for a grid when it is split in two (the grid gets a new id).

## License

[MIT](LICENSE)
