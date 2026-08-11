#!/usr/bin/env python3
"""Converts a PNG/JPG into a real Don't Starve Together KTEX texture + matching
Klei Atlas XML, so custom art (e.g. AI-generated concept art) can be shipped as
an actual in-game asset instead of just a reference image.

Format reverse-engineered from the authoritative, canonical open-source tool
(github.com/nsimplex/ktools, GPLv2) — read directly from its source rather than
guessed from memory, specifically:
  src/common/ktex/specs.cpp      (header bitfield layout + MAGIC_NUMBER)
  src/common/ktex/ktex.cpp       (dump()/CompressMipmap() — byte layout, RGBA
                                   path, default flip_image=true)
  src/common/binary_io_utils.hpp (write_integer: writes sizeof(T) bytes per
                                   field's actual C++ type, little-endian)

File layout produced (single mipmap, uncompressed RGBA — avoids reimplementing
DXT/squish block compression, which real DST also accepts for simple UI/icon
textures):
  4 bytes  "KTEX" (magic, written as raw native bytes — little-endian here)
  4 bytes  packed header uint32, little-endian, bitfields LSB-first:
             platform(4)=0(Default), compression(5)=4(RGBA),
             texture_type(4)=1(2D), mipmap_count(5)=1, flags(2)=3(default),
             fill(12)=4095(0xFFF, the default — must match exactly so the
             game's own endianness auto-detection in Header::load() succeeds)
  10 bytes mipmap "pre" header: width(u16), height(u16), pitch(u16)=4*width,
           datasz(u32) — all little-endian
  N bytes  raw RGBA8888 pixel data, row-major, VERTICALLY FLIPPED (ktools'
           own flip_image defaults to true — DST textures are bottom-up)

Usage: python png_to_ktex.py <input.png> <output_basename_without_ext> [max_size]
Writes <output_basename>.tex and <output_basename>.xml (element name =
basename of the given path, matching the "<id>.tex" convention SetTexture/
GetInventoryItemAtlas callers look up by).
"""
import struct
import sys
from pathlib import Path

from PIL import Image


def pack_header(mipmap_count: int) -> bytes:
    platform = 0
    compression = 4  # RGBA
    texture_type = 1  # 2D
    flags = 3
    fill = 4095  # 0xFFF — must equal the real default for endianness auto-detect
    data = (
        (platform & 0xF)
        | ((compression & 0x1F) << 4)
        | ((texture_type & 0xF) << 9)
        | ((mipmap_count & 0x1F) << 13)
        | ((flags & 0x3) << 18)
        | ((fill & 0xFFF) << 20)
    )
    return struct.pack("<I", data)


def png_to_ktex(src_path: str, dst_basename: str, max_size: int = 256) -> None:
    img = Image.open(src_path).convert("RGBA")

    if max(img.size) > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)

    width, height = img.size
    # ktools' own CompressMipmap flips before writing (flip_image defaults to
    # true) — DST stores texture data bottom-up.
    flipped = img.transpose(Image.FLIP_TOP_BOTTOM)
    pixel_data = flipped.tobytes("raw", "RGBA")

    pitch = width * 4

    out_tex = Path(f"{dst_basename}.tex")
    out_tex.parent.mkdir(parents=True, exist_ok=True)
    with open(out_tex, "wb") as f:
        f.write(b"KTEX")
        f.write(pack_header(mipmap_count=1))
        f.write(struct.pack("<HHH", width, height, pitch))
        f.write(struct.pack("<I", len(pixel_data)))
        f.write(pixel_data)

    element_name = Path(dst_basename).name + ".tex"
    tex_filename = Path(dst_basename).name + ".tex"
    xml = (
        f'<Atlas><Texture filename="{tex_filename}" />'
        f'<Elements><Element name="{element_name}" '
        f'u1="0" u2="1" v1="0" v2="1" /></Elements></Atlas>\n'
    )
    Path(f"{dst_basename}.xml").write_text(xml, encoding="utf-8")

    print(f"Wrote {out_tex} ({width}x{height}) and matching .xml")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python png_to_ktex.py <input.png> <output_basename> [max_size]")
        sys.exit(1)
    max_sz = int(sys.argv[3]) if len(sys.argv) > 3 else 256
    png_to_ktex(sys.argv[1], sys.argv[2], max_sz)
