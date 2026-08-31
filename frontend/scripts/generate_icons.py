"""Genera los iconos PNG de la PWA sin dependencias externas.

Uso:  python scripts/generate_icons.py
Salida: public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon-180}.png
"""
from __future__ import annotations

import math
import os
import struct
import zlib

NAVY = (26, 26, 46)
BARS = [(67, 97, 238), (46, 196, 182), (248, 249, 250)]  # azul, verde azulado, casi blanco
SUPERSAMPLE = 4


def rounded_rect_span(y: float, x0: float, y0: float, x1: float, y1: float, r: float):
    """Rango horizontal [a, b] que ocupa un rectangulo redondeado en la altura y."""
    if y < y0 or y > y1:
        return None
    r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
    if y < y0 + r:
        dy = y0 + r - y
    elif y > y1 - r:
        dy = y - (y1 - r)
    else:
        return x0, x1
    if dy > r:
        return None
    dx = r - math.sqrt(max(r * r - dy * dy, 0.0))
    return x0 + dx, x1 - dx


def render(size: int, radius_ratio: float, content_ratio: float) -> bytes:
    """Devuelve los bytes RGBA de un icono cuadrado."""
    shapes: list[tuple[tuple[float, float, float, float, float], tuple[int, int, int]]] = []

    bg_radius = size * radius_ratio
    shapes.append(((0.0, 0.0, float(size), float(size), bg_radius), NAVY))

    # Tres barras de altura creciente, centradas en el area de contenido.
    inner = size * content_ratio
    left = (size - inner) / 2
    top = (size - inner) / 2
    bar_w = inner * 0.20
    gap = inner * 0.10
    total_w = bar_w * 3 + gap * 2
    start_x = left + (inner - total_w) / 2
    base_y = top + inner * 0.86
    heights = [inner * 0.38, inner * 0.60, inner * 0.82]
    for i, (h, color) in enumerate(zip(heights, BARS)):
        x0 = start_x + i * (bar_w + gap)
        shapes.append(((x0, base_y - h, x0 + bar_w, base_y, bar_w / 2), color))

    out = bytearray()
    bg_geom, bg_color = shapes[0]
    bars = shapes[1:]
    step = 1.0 / SUPERSAMPLE

    for py in range(size):
        sum_r = [0.0] * size
        sum_g = [0.0] * size
        sum_b = [0.0] * size
        bg_cov = [0.0] * size
        bar_cov = [0.0] * size

        for s in range(SUPERSAMPLE):
            y = py + (s + 0.5) * step
            span = rounded_rect_span(y, *bg_geom)
            if span is not None:
                a, b = span
                for px in range(max(0, int(a)), min(size, int(math.ceil(b)))):
                    cov = min(b, px + 1.0) - max(a, float(px))
                    if cov > 0:
                        bg_cov[px] += cov * step
            for geom, color in bars:
                span = rounded_rect_span(y, *geom)
                if span is None:
                    continue
                a, b = span
                cr, cg, cb = color
                for px in range(max(0, int(a)), min(size, int(math.ceil(b)))):
                    cov = (min(b, px + 1.0) - max(a, float(px))) * step
                    if cov <= 0:
                        continue
                    bar_cov[px] += cov
                    sum_r[px] += cr * cov
                    sum_g[px] += cg * cov
                    sum_b[px] += cb * cov

        out.append(0)  # filtro de fila PNG: none
        br, bgc, bb = bg_color
        for px in range(size):
            # Las barras estan contenidas en el fondo: la parte visible del fondo es la diferencia.
            visible_bg = max(bg_cov[px] - bar_cov[px], 0.0)
            alpha = min(bg_cov[px], 1.0)
            r = sum_r[px] + br * visible_bg
            g = sum_g[px] + bgc * visible_bg
            b_ = sum_b[px] + bb * visible_bg
            if alpha > 0:
                r, g, b_ = r / alpha, g / alpha, b_ / alpha
            out += bytes(
                (
                    min(255, int(r + 0.5)),
                    min(255, int(g + 0.5)),
                    min(255, int(b_ + 0.5)),
                    int(alpha * 255 + 0.5),
                )
            )
    return bytes(out)


def write_png(path: str, size: int, raw: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as fh:
        fh.write(png)


def main() -> None:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(here, "public", "icons")
    os.makedirs(out_dir, exist_ok=True)

    # (archivo, tamano, redondeo, area de contenido)
    targets = [
        ("icon-192.png", 192, 0.22, 0.66),
        ("icon-512.png", 512, 0.22, 0.66),
        ("maskable-512.png", 512, 0.0, 0.52),  # margen extra para el recorte de Android
        ("apple-touch-icon-180.png", 180, 0.0, 0.66),  # iOS aplica su propia mascara
    ]
    for name, size, radius, content in targets:
        write_png(os.path.join(out_dir, name), size, render(size, radius, content))
        print("generado", name, str(size) + "x" + str(size))


if __name__ == "__main__":
    main()
