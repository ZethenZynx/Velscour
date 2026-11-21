"""Extract the supplied 5x4 Treasure Imp sheet into normalized transparent game sprites.

Run: python tools/extract_treasure_imp_sprites.py <source-png> [output-directory]
This is a deterministic crop/mask/downsample step; it does not generate or redraw artwork.
"""
from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageFilter

NAMES = [
    "treasure", "blood", "relic", "merchant", "hoarder",
    "jackpot", "jewel", "alchemist", "vitality", "prosperity",
    "sigil", "arcane", "set", "enchanted", "mystic",
    "fortune", "celestial", "artisan", "abyssal", "prismatic",
]
CELL_COLUMNS = 5
CELL_ROWS = 4
CANVAS = 80
MAX_SPRITE = 70

# Detached fragments from the imp in the next row were included by the original
# sheet masks. These are tightly scoped pixel regions on the normalized 80x80
# canvases; clearing only their alpha preserves each imp's own lower details.
LOWER_NEIGHBOR_MASKS = {
    "jewel": ((37, 74, 39, 76),),
    "sigil": ((25, 73, 35, 75), (40, 73, 48, 75)),
    "arcane": ((42, 71, 61, 76), (35, 72, 40, 76), (26, 72, 29, 76)),
    "set": ((35, 73, 45, 76), (53, 74, 58, 76)),
    "enchanted": ((30, 73, 41, 76),),
    "mystic": ((35, 73, 44, 76), (50, 74, 55, 76)),
}


def clear_neighbor_fragments(canvas: Image.Image, name: str) -> None:
    """Remove only the known, disconnected next-row fragments from this sprite."""
    for left, top, right, bottom in LOWER_NEIGHBOR_MASKS.get(name, ()):
        canvas.paste((0, 0, 0, 0), (left, top, right, bottom))


def mask_foreground(crop: Image.Image) -> Image.Image:
    rgb = crop.convert("RGB")
    # The supplied backgrounds are broad, smooth gradients. A local low-frequency estimate lets us
    # isolate the sharp illustrated edges without keying any imp colors out of the source artwork.
    background = rgb.filter(ImageFilter.GaussianBlur(radius=32))
    difference = ImageChops.difference(rgb, background).convert("L")
    binary = difference.point(lambda value: 255 if value >= 23 else 0)
    # Expand sharp artwork edges by one pixel to avoid pinholes while leaving enclosed holes transparent;
    # filling every enclosed region would mistakenly restore a background glow trapped inside a sprite outline.
    return binary.filter(ImageFilter.MaxFilter(3))


def extract(source: Path, output: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    if sheet.width < CELL_COLUMNS or sheet.height < CELL_ROWS:
        raise ValueError("The source image is too small for the documented 5-by-4 layout.")
    output.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(NAMES):
        row, col = divmod(index, CELL_COLUMNS)
        bounds = (
            round(col * sheet.width / CELL_COLUMNS),
            round(row * sheet.height / CELL_ROWS),
            round((col + 1) * sheet.width / CELL_COLUMNS),
            round((row + 1) * sheet.height / CELL_ROWS),
        )
        crop = sheet.crop(bounds)
        rgba = crop.copy()
        rgba.putalpha(mask_foreground(crop))
        bbox = rgba.getbbox()
        if not bbox:
            raise ValueError(f"No sprite foreground detected for {name} (row {row + 1}, column {col + 1}).")
        sprite = rgba.crop(bbox)
        # The final art is deliberately pixelated at the game's small world scale; nearest-neighbour
        # normalization retains crisp edges and puts all feet on the same baseline.
        factor = min(1, MAX_SPRITE / max(sprite.size))
        sprite = sprite.resize((max(1, round(sprite.width * factor)), max(1, round(sprite.height * factor))), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        x = (CANVAS - sprite.width) // 2
        y = CANVAS - 5 - sprite.height
        canvas.alpha_composite(sprite, (x, y))
        clear_neighbor_fragments(canvas, name)
        canvas.save(output / f"{name}.png", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: python tools/extract_treasure_imp_sprites.py <source-png> [output-directory]")
    src = Path(sys.argv[1])
    dest = Path(sys.argv[2]) if len(sys.argv) == 3 else Path("assets/sprites/treasure-imps")
    extract(src, dest)
    print(f"Extracted {len(NAMES)} sprites to {dest}")
