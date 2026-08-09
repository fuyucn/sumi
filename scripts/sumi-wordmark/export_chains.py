"""Split the "sumi" skeleton into ordered stroke chains for a handwriting
animation. Unlike the maze-ordered Eulerian trail in centerline.json (which
retraces and jumps around in x), this exports the skeleton-graph chains
directly: each chain is a clean stroke segment between junctions, oriented
left-to-right and sorted by its start x, so a staggered dash-reveal reads as
one continuous pen stroke S -> u -> m -> i.
"""

import json
import math

from skimage.morphology import skeletonize

from centerline import (
    OUT,
    SCALE,
    catmull_rom_to_path,
    contract_chains,
    merge_junction_clusters,
    parse_path,
    rasterize_word,
    simplify,
    skeleton_graph,
)


def to_units(pts):
    return [((x + ox) / SCALE, (y + oy) / SCALE) for x, y in pts]


manifest = json.load(open(f"{OUT}/manifest.json"))
entry = manifest["alexbrush-sumi"]
W, H = entry["viewBox"]
glyphs = entry["glyphs"]

subpaths_by_glyph = [parse_path(g["d"]) for g in glyphs]
binary, ox, oy = rasterize_word(subpaths_by_glyph, SCALE)
skel = skeletonize(binary)
nodes, edges = skeleton_graph(skel)
jnodes, chains = contract_chains(nodes, edges)
jnodes, chains = merge_junction_clusters(jnodes, chains)

print(f"jnodes={len(jnodes)} chains={len(chains)}")

out_chains = []
dropped = 0
for a, b, pts in chains:
    u = to_units(pts)
    L = sum(math.dist(p, q) for p, q in zip(u, u[1:]))
    xs = [p[0] for p in u]
    # The i-dot is its own tiny skeleton component; it is rendered separately
    # as the final "pen lift" stroke, so drop it from the word chains.
    if min(xs) > 1650 and L < 40:
        continue
    if L < 5 or len(u) < 3:
        dropped += 1
        continue
    # Orient so the stroke starts on its left side, matching the flow of
    # connected script (upstrokes go right, downstrokes come back left).
    if u[0][0] > u[-1][0]:
        u = u[::-1]
    s = simplify(u, 0.6)
    if len(s) >= 2:
        out_chains.append(
            {
                "d": catmull_rom_to_path(s),
                "n": len(s),
                "x0": round(s[0][0], 1),
                "x1": round(s[-1][0], 1),
                "L": round(L, 1),
            }
        )

out_chains.sort(key=lambda c: c["x0"])

print(f"exported={len(out_chains)} dropped={dropped}")
for i, c in enumerate(out_chains):
    print(f"  [{i}] x {c['x0']} -> {c['x1']}  L={c['L']}  pts={c['n']}")

result = {
    "viewBox": [W, H],
    "chains": out_chains,
    "dot": json.load(open(f"{OUT}/centerline.json"))["paths"][1]["d"],
    "fill": " ".join(g["d"] for g in glyphs),
    "maxThickness": 69.9,
    "coverWidth": 80.4,
}
with open(f"{OUT}/chains.json", "w") as f:
    json.dump(result, f)
print("wrote chains.json")
