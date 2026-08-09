#!/usr/bin/env python3
"""Build one continuous pen trail from the whole "sumi" word outline.

Alex Brush is a connected script font: its glyphs already overlap in the
absolute word space, so rasterizing s+u+m+i+dot together and thinning the
union gives ONE connected skeleton. Tracing an Eulerian trail over it (with
invisible retraces at crossings) produces a natural S -> u -> m -> i pen
stroke. Steps:

  1. rasterize each glyph with even-odd fill (counters stay holes) and OR the
     per-glyph rasters so overlapping letters add ink instead of cancelling
  2. skeletonize (medial axis thinning)
  3. contract maximal degree-2 runs into chain edges
  4. merge junction clusters (skeleton noise) and prune micro chains
  5. trace an Eulerian pen trail: greedy straight continuation at junctions,
     backtrack with *recorded* direction when the pen dead-ends, and jump to
     the next connected component (pen lift) when the current one is done
  6. split the raw trail at pen-lift jumps, RDP-simplify, Catmull-Rom smooth

Output: JSON with the word's stroke path(s), the filled mask path and the
stroke width that covers the widest ink.
"""

import json
import math
import re

import numpy as np
from skimage.morphology import skeletonize

import os

import networkx as nx

# Output directory: the directory this script lives in, so the archive is
# self-contained — run it from the repo root and artifacts land next to it.
OUT = os.path.dirname(os.path.abspath(__file__))
SCALE = 4  # pixels per SVG unit — 8x is overkill for a ~40px logo
JUMP = 4.0  # units; a trail step longer than this is a pen lift
RDP_EPS = 2.0  # units for Douglas-Peucker on the final trail


def parse_path(d):
    """Parse an SVG path string into subpaths of flattened (x, y) points."""
    tokens = re.findall(r"[MmLlQqCcZz]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", d)
    subpaths = []
    cur = None
    i = 0
    pos = (0.0, 0.0)

    def num():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    while i < len(tokens):
        t = tokens[i]
        if t == "M":
            i += 1
            x, y = num(), num()
            pos = (x, y)
            cur = [pos]
            subpaths.append(cur)
        elif t == "m":
            i += 1
            x, y = num(), num()
            pos = (pos[0] + x, pos[1] + y)
            cur = [pos]
            subpaths.append(cur)
        elif t == "L":
            i += 1
            x, y = num(), num()
            pos = (x, y)
            cur.append(pos)
        elif t == "l":
            i += 1
            x, y = num(), num()
            pos = (pos[0] + x, pos[1] + y)
            cur.append(pos)
        elif t == "C":
            i += 1
            x1, y1, x2, y2, x, y = num(), num(), num(), num(), num(), num()
            pos = _flatten_cubic(cur[-1], (x1, y1), (x2, y2), (x, y), cur)
        elif t == "c":
            i += 1
            x1, y1, x2, y2, x, y = num(), num(), num(), num(), num(), num()
            p0 = cur[-1]
            pos = _flatten_cubic(
                p0,
                (p0[0] + x1, p0[1] + y1),
                (p0[0] + x2, p0[1] + y2),
                (p0[0] + x, p0[1] + y),
                cur,
            )
        elif t == "Q":
            i += 1
            x1, y1, x, y = num(), num(), num(), num()
            pos = _flatten_quad(cur[-1], (x1, y1), (x, y), cur)
        elif t == "q":
            i += 1
            x1, y1, x, y = num(), num(), num(), num()
            p0 = cur[-1]
            pos = _flatten_quad(p0, (p0[0] + x1, p0[1] + y1), (p0[0] + x, p0[1] + y), cur)
        elif t == "Z" or t == "z":
            i += 1
            if cur and len(cur) >= 2:
                cur.append(cur[0])
        else:
            raise ValueError(f"unexpected token {t!r} at {i}")
    return subpaths


def _flatten_cubic(p0, p1, p2, p3, out, tol=0.35):
    # recursive subdivision until the chord error is below tol (SVG units)
    def flat(p0, p1, p2, p3):
        d1 = math.dist(p1, p0) + math.dist(p2, p3)
        d2 = math.dist(p3, p0)
        return abs(d1 - d2) <= tol

    def rec(p0, p1, p2, p3):
        if flat(p0, p1, p2, p3):
            out.append(p3)
            return p3
        m01 = _mid(p0, p1)
        m12 = _mid(p1, p2)
        m23 = _mid(p2, p3)
        m012 = _mid(m01, m12)
        m123 = _mid(m12, m23)
        m = _mid(m012, m123)
        rec(p0, m01, m012, m)
        rec(m, m123, m23, p3)

    rec(p0, p1, p2, p3)
    return out[-1]


def _flatten_quad(p0, p1, p2, out, tol=0.35):
    # quadratic -> cubic then reuse
    c1 = (p0[0] + 2 / 3 * (p1[0] - p0[0]), p0[1] + 2 / 3 * (p1[1] - p0[1]))
    c2 = (p2[0] + 2 / 3 * (p1[0] - p2[0]), p2[1] + 2 / 3 * (p1[1] - p2[1]))
    return _flatten_cubic(p0, c1, c2, p2, out, tol)


def _mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def rasterize_word(subpaths_by_glyph, scale):
    """Rasterize the whole word with per-glyph even-odd fill.

    Each glyph is XOR-filled on its own (counters stay holes), then the glyph
    rasters are OR-ed together so overlapping letters add ink exactly like a
    script font renderer. Returns (binary, ox, oy) with the global crop origin.
    """
    from skimage import draw

    flat = [
        [(x * scale, y * scale) for x, y in sp]
        for subpaths in subpaths_by_glyph
        for sp in subpaths
    ]
    xs = [p[0] for sp in flat for p in sp]
    ys = [p[1] for sp in flat for p in sp]
    if not xs:
        return np.zeros((2, 2), dtype=bool), 0, 0
    x0, x1 = int(min(xs)) - 2, int(max(xs)) + 2
    y0, y1 = int(min(ys)) - 2, int(max(ys)) + 2
    img = np.zeros((y1 - y0 + 1, x1 - x0 + 1), dtype=bool)
    for subpaths in subpaths_by_glyph:
        glyph_mask = np.zeros_like(img)
        for sp in subpaths:
            pts = [(x * scale - x0, y * scale - y0) for x, y in sp]
            if len(pts) < 3:
                continue
            rr, cc = draw.polygon([p[1] for p in pts], [p[0] for p in pts])
            glyph_mask[rr, cc] ^= True
        img |= glyph_mask
    return img, x0, y0


def skeleton_graph(binary):
    """Return (nodes list[(x,y)], edges[(i,j)]...) with 8-connectivity."""
    ys, xs = np.nonzero(binary)
    idx = {}
    nodes = []
    for k, (y, x) in enumerate(zip(ys, xs)):
        idx[(int(y), int(x))] = k
        nodes.append((int(x), int(y)))
    edges = set()
    for k, (y, x) in enumerate(zip(ys, xs)):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                j = idx.get((int(y) + dy, int(x) + dx))
                if j is not None:
                    edges.add((min(k, j), max(k, j)))
    return nodes, list(edges)


def contract_chains(nodes, edges):
    """Contract maximal degree-2 runs into chain edges with their polylines.

    Walks from each junction/endpoint *through* every degree-2 pixel until it
    reaches the next junction/endpoint (or returns to the start in a closed
    loop). Returns (jnodes, chains) where jnodes is the list of junction
    points and chains is a list of (a, b, pts) with a/b indices into jnodes.
    """
    G = nx.Graph()
    G.add_nodes_from(range(len(nodes)))
    G.add_edges_from(edges)
    comps = [c for c in nx.connected_components(G) if len(c) >= 2]
    keep = set()
    for c in comps:
        keep |= c
    G = G.subgraph(keep).copy()
    if not G.number_of_edges():
        return [], []

    junction = {n for n, d in G.degree() if d != 2}
    # pure cycles have no junction — break them at the leftmost node
    for c in nx.connected_components(G):
        if not (set(c) & junction):
            junction.add(min(c, key=lambda n: (nodes[n][0], nodes[n][1])))
    jlist = sorted(junction)
    jmap = {n: i for i, n in enumerate(jlist)}
    used = set()
    chains = []
    for n0 in jlist:
        for nbr in G.neighbors(n0):
            if (min(n0, nbr), max(n0, nbr)) in used:
                continue
            prev, cur = n0, nbr
            pts = [nodes[n0]]
            while True:
                pts.append(nodes[cur])
                used.add((min(prev, cur), max(prev, cur)))
                if cur in junction:
                    break
                nxts = [n for n in G.neighbors(cur) if n != prev]
                if not nxts:
                    break
                nxt = nxts[0]
                if (min(cur, nxt), max(cur, nxt)) in used:
                    break
                prev, cur = cur, nxt
            chains.append((jmap[n0], jmap[cur], pts))
    return [nodes[n] for n in jlist], chains


def merge_junction_clusters(jnodes, chains, merge_px=6, min_chain_px=6):
    """Merge junctions closer than merge_px and drop skeleton-noise chains.

    Skeletonize leaves tiny junction clusters where strokes cross; the trace
    then generates nonsense micro-branches. Union-find merges clusters into
    one junction; chains that collapse to a point (both ends in one cluster
    and shorter than min_chain_px) are dropped. Returns (jnodes, chains) with
    remapped indices.
    """
    n = len(jnodes)
    parent = list(range(n))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for i in range(n):
        xi, yi = jnodes[i]
        for j in range(i + 1, n):
            if math.dist(jnodes[i], jnodes[j]) < merge_px:
                union(i, j)

    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    idmap = {old: new for new, g in enumerate(groups.values()) for old in g}
    new_jnodes = []
    for g in groups.values():
        xs = sum(jnodes[i][0] for i in g) / len(g)
        ys = sum(jnodes[i][1] for i in g) / len(g)
        new_jnodes.append((xs, ys))

    new_chains = []
    for a, b, pts in chains:
        A, B = idmap[a], idmap[b]
        if len(pts) < min_chain_px:
            continue
        if A == B and len(pts) < 12:
            continue  # collapsed noise loop
        new_chains.append((A, B, pts))
    return new_jnodes, new_chains


def trace_chains(jnodes, chains):
    """Trace one pen trail covering every chain of the skeleton graph.

    Greedy straight-continuation at junctions; when the pen dead-ends it
    retraces back along the trail to the nearest junction with unused chains
    (retraced ink is invisible in the final drawing). Each step records the
    actual polyline walked so the retrace reverses the real direction. When a
    component is exhausted the pen jumps to the nearest unused chain — that
    jump is a pen lift and becomes a subpath boundary later. Returns a
    polyline of (x, y) pixel points.
    """
    if not chains:
        return []

    adj = [[] for _ in jnodes]
    for i, (a, b, _) in enumerate(chains):
        if a == b:
            adj[a].append((i, a))  # closed loop at a
        else:
            adj[a].append((i, b))
            adj[b].append((i, a))

    def orient(j, i, nb):
        a, b, pts = chains[i]
        if a == j and b == nb:
            return pts
        if b == j and a == nb:
            return pts[::-1]
        # closed loop (a == b == j == nb): walk forward
        return pts

    def unused_at(j):
        return [t for t in adj[j] if t[0] not in used]

    def exit_dir(j, i, nb):
        pts = orient(j, i, nb)
        p0 = pts[0]
        p1 = pts[1] if len(pts) > 1 else p0
        d = (p1[0] - p0[0], p1[1] - p0[1])
        L = math.hypot(*d) or 1
        return (d[0] / L, d[1] / L)

    def chain_end_pts(i):
        pts = chains[i][2]
        return pts[0], pts[-1]

    used = set()
    odd = [j for j, t in enumerate(adj) if len(t) % 2 == 1]
    start = min(odd, key=lambda j: jnodes[j][0]) if odd else min(range(len(jnodes)), key=lambda j: jnodes[j][0])
    out = [jnodes[start]]
    trail_j = [start]
    trail_walk = []
    pos = start

    while len(used) < len(chains):
        cands = unused_at(pos)
        if cands:
            in_d = None
            if len(out) >= 2:
                ax, ay = out[-2]
                bx, by = out[-1]
                d = (bx - ax, by - ay)
                L = math.hypot(*d) or 1
                in_d = (d[0] / L, d[1] / L)
            if in_d is None:
                i, nb = cands[0]
            else:
                scored = sorted(
                    (
                        (
                            exit_dir(pos, i, nb)[0] * in_d[0]
                            + exit_dir(pos, i, nb)[1] * in_d[1],
                            i,
                            nb,
                        )
                        for i, nb in cands
                    ),
                    key=lambda t: -t[0],
                )
                i, nb = scored[0][1], scored[0][2]
            walk = orient(pos, i, nb)
            out.extend(walk[1:])
            used.add(i)
            trail_j.append(nb)
            trail_walk.append(walk)
            pos = nb
        else:
            moved = False
            for idx in range(len(trail_j) - 2, -1, -1):
                j = trail_j[idx]
                if unused_at(j):
                    for k in range(len(trail_j) - 2, idx - 1, -1):
                        out.extend(trail_walk[k][-2::-1])
                    pos = j
                    del trail_j[idx + 1 :]
                    del trail_walk[idx:]
                    moved = True
                    break
            if not moved:
                # pen lift: jump to the nearest unused chain endpoint
                best = None
                for i in range(len(chains)):
                    if i in used:
                        continue
                    p0, p1 = chain_end_pts(i)
                    d0 = math.dist(out[-1], p0)
                    d1 = math.dist(out[-1], p1)
                    d, p, j = (d0, p0, chains[i][0]) if d0 <= d1 else (d1, p1, chains[i][1])
                    if best is None or d < best[0]:
                        best = (d, p, j, i)
                if best is None:
                    break
                out.append(best[1])
                pos = best[2]
                trail_j = [pos]
                trail_walk = []
    return out


def simplify(pts, eps=0.3):
    """Douglas-Peucker polyline simplification."""
    if len(pts) < 3:
        return pts

    def seg_dist(p, a, b):
        ax, ay = a
        bx, by = b
        px, py = p
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        if L2 == 0:
            return math.dist(p, a)
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
        qx, qy = ax + t * dx, ay + t * dy
        return math.dist(p, (qx, qy))

    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        dmax = 0.0
        imax = a
        for i in range(a + 1, b):
            d = seg_dist(pts[i], pts[a], pts[b])
            if d > dmax:
                dmax = d
                imax = i
        if dmax > eps:
            keep[imax] = True
            stack.append((a, imax))
            stack.append((imax, b))
    return [p for p, k in zip(pts, keep) if k]


def catmull_rom_to_path(pts):
    """Smooth a polyline with Catmull-Rom and emit a cubic-Bezier SVG path."""
    if len(pts) < 2:
        return ""
    if len(pts) == 2:
        return f"M {pts[0][0]:.1f} {pts[0][1]:.1f} L {pts[1][0]:.1f} {pts[1][1]:.1f}"
    parts = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    n = len(pts)
    for i in range(n - 1):
        p0 = pts[i - 1] if i - 1 >= 0 else pts[0]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else pts[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        parts.append(f"C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
    return " ".join(parts)


def main():
    manifest = json.load(open(f"{OUT}/manifest.json"))
    entry = manifest["alexbrush-sumi"]
    W, H = entry["viewBox"]
    glyphs = entry["glyphs"]  # s, u, m, i, dot

    subpaths_by_glyph = [parse_path(g["d"]) for g in glyphs]
    binary, ox, oy = rasterize_word(subpaths_by_glyph, SCALE)
    skel = skeletonize(binary)

    dist = _distance(binary)
    sk_dist = dist[skel]
    max_thickness = 2.0 * float(sk_dist.max()) / SCALE
    cover = max_thickness * 1.15

    nodes, edges = skeleton_graph(skel)
    jnodes, chains = contract_chains(nodes, edges)
    jnodes, chains = merge_junction_clusters(jnodes, chains)
    trail = trace_chains(jnodes, chains)

    pts_units = [((x + ox) / SCALE, (y + oy) / SCALE) for x, y in trail]
    segs = [[pts_units[0]]]
    for a, b in zip(pts_units, pts_units[1:]):
        if math.dist(a, b) > JUMP:
            segs.append([])
        segs[-1].append(b)
    paths = []
    for s in segs:
        if len(s) < 3:
            continue
        # long pen trails (the word) can take a coarse simplification; tiny
        # trails like the i-dot need their curve preserved
        eps = RDP_EPS if len(s) > 500 else 0.4
        s = simplify(s, eps)
        if len(s) >= 2:
            paths.append({"d": catmull_rom_to_path(s), "n": len(s)})

    result = {
        "viewBox": [W, H],
        "paths": paths,
        "fill": " ".join(g["d"] for g in glyphs),
        "maxThickness": round(max_thickness, 1),
        "coverWidth": round(cover, 1),
    }
    print(
        f"word: {len(paths)} subpath(s), raw {len(trail)} -> points "
        f"{[p['n'] for p in paths]}, cover {cover:.1f}"
    )

    with open(f"{OUT}/centerline.json", "w") as f:
        json.dump(result, f)
    print("wrote centerline.json")


def _distance(binary):
    from scipy import ndimage

    dist = ndimage.distance_transform_edt(binary)
    return dist


if __name__ == "__main__":
    main()
