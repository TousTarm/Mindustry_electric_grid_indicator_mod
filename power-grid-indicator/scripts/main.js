// Power Grid Indicator: node-to-node power links on the minimap + a power history chart for the clicked node's grid.

let enabled = Core.settings.getBool("pgi-enabled", false);

const REFRESH_MS = 500;
let lastRefresh = 0;
let segments = []; // flat x1,y1,x2,y2,satisfaction list of node links
let dots = [];     // flat x,y,satisfaction list of nodes

const SAMPLE_TICKS = 60; // one chart point = average over 1 second
const HISTORY = 180;     // 3 minutes of points
const AVG_POINTS = 5;    // text values = average of the last 5 seconds
const PROD_COLOR = Color.valueOf("8de05a"), CONS_COLOR = Color.valueOf("f25555"), BATTERY_COLOR = Color.valueOf("5eb8ff");

// graph id -> {prod: [], cons: [], stored, capacity, satisfaction}; per second per grid.
// shortcut: history is keyed by PowerGraph id, so it restarts when a grid is split; fine for a viewer.
let history = {};
let acc = {};
let accTicks = 0;
let selected = null; // clicked power node

function isNode(b){
    return b != null && (b.block instanceof PowerNode || b.block instanceof BeamNode);
}

function eachTeamGraph(f){
    let team = Vars.player.team();
    Groups.powerGraph.each(e => {
        let g = e.graph;
        if(g != null && !g.all.isEmpty() && g.all.first().team == team) f(g);
    });
}

// ---- minimap: node links ----

function refresh(){
    segments = [];
    dots = [];
    eachTeamGraph(g => {
        let sat = g.getSatisfaction();
        g.all.each(b => {
            if(!isNode(b)) return;
            dots.push(b.x, b.y, sat);
            let link = o => {
                if(!isNode(o)) return;
                // same-kind links are stored on both ends: draw once. Laser node <-> beam node is stored on one end only.
                let sameKind = (o.block instanceof PowerNode) == (b.block instanceof PowerNode);
                if(!sameKind || o.pos() > b.pos()){
                    segments.push(b.x, b.y, o.x, o.y, sat);
                }
            };
            if(b.block instanceof PowerNode){
                b.power.links.each(pos => link(Vars.world.build(pos)));
            }else{
                for(let i = 0; i < b.links.length; i++) link(b.links[i]);
            }
        });
    });
}

function drawLinks(px, under){
    for(let i = 0; i < segments.length; i += 5){
        if(!under) Draw.color(Color.scarlet, Pal.powerLight, segments[i + 4]);
        Lines.line(segments[i], segments[i + 1], segments[i + 2], segments[i + 3]);
    }
    for(let i = 0; i < dots.length; i += 3){
        if(!under) Draw.color(Color.scarlet, Pal.powerLight, dots[i + 2]);
        Fill.square(dots[i], dots[i + 1], (under ? 3.5 : 2.5) * Scl.scl(1) * px, 45);
    }
}

// Drawn by the game's own minimap code (corner minimap and fullscreen map), already in world coordinates.
const marker = extend(MapObjectives.ObjectiveMarker, {
    draw(scaleFactor){
        if(!enabled || dots.length == 0) return;
        // world -> screen scale of the current minimap, so lines keep the same pixel width at any zoom
        let px = 1 / Draw.trans().val[0];

        Draw.color(Pal.darkestGray, 0.8);
        Lines.stroke(Scl.scl(3) * px);
        drawLinks(px, true);

        Lines.stroke(Scl.scl(1.5) * px);
        drawLinks(px, false);
        Draw.reset();
    }
});
marker.world = -1;
marker.light = -1;

// ---- power history ----

function sample(){
    eachTeamGraph(g => {
        let id = g.getID();
        let a = acc[id] || (acc[id] = {g: g, p: 0, c: 0, n: 0});
        a.p += g.getLastScaledPowerIn();
        a.c += g.getLastScaledPowerOut();
        a.n++;
    });

    accTicks += Time.delta;
    if(accTicks < SAMPLE_TICKS) return;
    accTicks = 0;

    // rebuilt from live grids only, so history of removed grids is dropped
    let next = {};
    Object.keys(acc).forEach(id => {
        let a = acc[id];
        let h = history[id] || {prod: [], cons: []};
        h.prod.push(a.p / a.n * 60); // per tick -> per second
        h.cons.push(a.c / a.n * 60);
        if(h.prod.length > HISTORY){ h.prod.shift(); h.cons.shift(); }
        h.stored = a.g.getLastPowerStored();
        h.capacity = a.g.getLastCapacity();
        h.satisfaction = a.g.getSatisfaction();
        next[id] = h;
    });
    history = next;
    acc = {};
}

function selectedHistory(){
    return selected == null ? null : history[selected.power.graph.getID()];
}

function avg(arr){
    let n = Math.min(AVG_POINTS, arr.length);
    let s = 0;
    for(let i = arr.length - n; i < arr.length; i++) s += arr[i];
    return n == 0 ? 0 : s / n;
}

function fmt(v){
    let a = Math.abs(v);
    return a >= 1e6 ? (v / 1e6).toFixed(1) + "M" : a >= 1e3 ? (v / 1e3).toFixed(1) + "k" : Math.round(v) + "";
}

// plain JS Math only: from JS, Mathf.clamp(x, -1, 1) resolves to the int overload and truncates
function chartMax(h){
    let m = 1;
    for(let i = 0; i < h.prod.length; i++) m = Math.max(m, h.prod[i], h.cons[i]);
    return m * 1.15;
}

const chart = extend(Element, {
    draw(){
        let x = this.x, y = this.y, w = this.width, ht = this.height;
        Draw.color(Pal.darkestGray, 0.9);
        Fill.crect(x, y, w, ht);

        Draw.color(Pal.gray, 0.5);
        Lines.stroke(Scl.scl(1));
        for(let k = 1; k < 4; k++) Lines.line(x, y + ht * k / 4, x + w, y + ht * k / 4);

        let h = selectedHistory();
        if(h != null && h.prod.length >= 2){
            let max = chartMax(h), step = w / (HISTORY - 1);
            // newest point on the right edge, history scrolls left
            let series = (arr, color) => {
                Draw.color(color);
                Lines.stroke(Scl.scl(2));
                let x0 = x + w - (arr.length - 1) * step;
                for(let i = 1; i < arr.length; i++){
                    Lines.line(x0 + (i - 1) * step, y + arr[i - 1] / max * ht, x0 + i * step, y + arr[i] / max * ht);
                }
            };
            series(h.cons, CONS_COLOR);
            series(h.prod, PROD_COLOR);
        }
        Draw.reset();
    }
});

// ---- update ----

Events.run(Trigger.update, () => {
    if(!Vars.state.isGame()) return;

    // markers get wiped on world load / server sync, so re-attach. Not added via markers.add() so it never ends up in saves.
    let list = Vars.state.markers.mapMarkers;
    if(!list.contains(marker, true)){
        marker.minimap = list.size;
        list.add(marker);
    }

    if(selected != null && (!selected.isValid() || selected.power == null)) selected = null;
    if(!Vars.state.isPaused()) sample();

    if(enabled && Time.timeSinceMillis(lastRefresh) > REFRESH_MS){
        lastRefresh = Time.millis();
        refresh();
    }
});

Events.on(WorldLoadEvent, () => {
    history = {};
    acc = {};
    selected = null;
});

// clicking a power node (any node of your team) opens its grid's chart
Events.on(TapEvent, e => {
    if(e.player != Vars.player) return;
    let b = e.tile.build;
    if(isNode(b) && b.team == Vars.player.team() && b.power != null) selected = b;
});

// ---- UI ----

// Shared top-right column on the fullscreen map; every minimap mod of this family stacks its panel into it.
function mapPanel(){
    let col = Core.scene.find("map-mod-panels");
    if(col == null){
        Vars.ui.hudGroup.fill(cons(root => {
            // not root.visible(...): in JS that name resolves to the boolean field, not the method
            root.visibility = boolp(() => Vars.ui.minimapfrag.shown());
            root.top().right().margin(8);
            col = root.table().get();
            col.name = "map-mod-panels";
        }));
    }
    return col;
}

// built on ClientLoadEvent: UI does not exist yet when scripts load
Events.on(ClientLoadEvent, () => {
    // [ Power grid  (eye) ] in the top-right of the fullscreen map (M key)
    const panel = mapPanel();
    panel.table(Styles.black6, cons(bar => {
        bar.margin(2);
        bar.add("Power grid").style(Styles.outlineLabel).padLeft(8).padRight(6).growX().left();
        bar.button(Icon.eyeSmall, Styles.clearNoneTogglei, () => {
            enabled = !enabled;
            Core.settings.put("pgi-enabled", enabled);
            lastRefresh = 0;
        }).size(36).checked(b => enabled).tooltip("Show power node links");
    })).growX().padBottom(4);
    panel.row();

    // grid chart window, right edge of the screen, same HUD style
    Vars.ui.hudGroup.fill(cons(root => {
        root.visibility = boolp(() => selected != null && Vars.state.isGame() && !Vars.ui.minimapfrag.shown());
        root.right().margin(8);

        root.table(Styles.black6, cons(t => {
            t.margin(6);
            t.defaults().left();

            t.table(cons(head => {
                head.label(() => selected == null ? "" : selected.block.localizedName + " [lightgray]grid").style(Styles.outlineLabel).growX().left();
                head.button(Icon.cancelSmall, Styles.clearNonei, () => selected = null).size(32).tooltip("Close");
            })).growX();
            t.row();

            t.label(() => {
                let h = selectedHistory();
                return h == null ? "" : "[lightgray]max " + fmt(chartMax(h)) + "/s, last " + Math.round(HISTORY * SAMPLE_TICKS / 60 / 60) + " min";
            }).padTop(2);
            t.row();
            t.add(chart).size(320, 120).padTop(2).padBottom(4);
            t.row();

            let line = (text) => { t.label(text).style(Styles.outlineLabel); t.row(); };
            line(() => {
                let h = selectedHistory();
                return h == null ? "[lightgray]collecting data..." : "[#" + PROD_COLOR + "]Production: " + fmt(avg(h.prod)) + "/s";
            });
            line(() => {
                let h = selectedHistory();
                return h == null ? "" : "[#" + CONS_COLOR + "]Consumption: " + fmt(avg(h.cons)) + "/s";
            });
            line(() => {
                let h = selectedHistory();
                if(h == null) return "";
                let bal = avg(h.prod) - avg(h.cons);
                return (bal >= 0 ? "[#" + PROD_COLOR + "]Balance: +" : "[#" + CONS_COLOR + "]Balance: ") + fmt(bal) + "/s"
                    + "  [lightgray](" + Math.round(h.satisfaction * 100) + "% satisfied)";
            });
            line(() => {
                let h = selectedHistory();
                return h == null || h.capacity <= 0 ? "" : "[#" + BATTERY_COLOR + "]Batteries: " + fmt(h.stored) + " / " + fmt(h.capacity)
                    + " (" + Math.round(h.stored / h.capacity * 100) + "%)";
            });
        }));
    }));
});
