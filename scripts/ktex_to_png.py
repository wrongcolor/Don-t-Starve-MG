#!/usr/bin/env python3
"""Sanity-check decoder for png_to_ktex.py's output — reads back a KTEX file
this project produced (single-mipmap, uncompressed RGBA only) and writes a PNG
so the conversion can be visually verified. Not a general KTEX reader.
"""
import struct
import sys

from PIL import Image


def ktex_to_png(src_path: str, dst_path: str) -> None:
    with open(src_path, "rb") as f:
        magic = f.read(4)
        assert magic == b"KTEX", f"bad magic: {magic!r}"
        (header,) = struct.unpack("<I", f.read(4))
        mipmap_count = (header >> 13) & 0x1F
        compression = (header >> 4) & 0x1F
        assert compression == 4, f"expected RGBA(4), got {compression}"
        assert mipmap_count >= 1

        width, height, pitch = struct.unpack("<HHH", f.read(6))
        (datasz,) = struct.unpack("<I", f.read(4))
        pixel_data = f.read(datasz)

    img = Image.frombytes("RGBA", (width, height), pixel_data, "raw", "RGBA")
    img = img.transpose(Image.FLIP_TOP_BOTTOM)  # undo the encoder's flip
    img.save(dst_path)
    print(f"Wrote {dst_path} ({width}x{height})")


if __name__ == "__main__":
    ktex_to_png(sys.argv[1], sys.argv[2])
