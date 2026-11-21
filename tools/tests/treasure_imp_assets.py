"""Validate the extracted Treasure Imp sprite set without launching the game."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
NAMES = (
    "treasure blood relic merchant hoarder jackpot jewel alchemist vitality prosperity "
    "sigil arcane set enchanted mystic fortune celestial artisan abyssal prismatic"
).split()
SPRITES = ROOT / "assets" / "sprites" / "treasure-imps"
LOWER_EDGE_LIMITS = {
    "jewel": 74,
    "sigil": 73,
    "arcane": 71,
    "set": 71,
    "enchanted": 73,
    "mystic": 71,
}

assert len(list(SPRITES.glob("*.png"))) == 20, "expected exactly 20 sprite files"
for name in NAMES:
    path = SPRITES / f"{name}.png"
    assert path.is_file(), f"missing sprite: {path.name}"
    with Image.open(path) as im:
        assert im.mode == "RGBA", f"{path.name} must have alpha transparency"
        assert im.size == (80, 80), f"{path.name} has an inconsistent canvas size: {im.size}"
        alpha = im.getchannel("A")
        assert alpha.getextrema()[0] == 0, f"{path.name} has no fully transparent background pixels"
        assert alpha.getextrema()[1] > 0, f"{path.name} is fully transparent"
        if name in LOWER_EDGE_LIMITS:
            edge = alpha.crop((0, LOWER_EDGE_LIMITS[name], im.width, im.height))
            assert edge.getbbox() is None, f"{path.name} still has stray pixels below its sprite"

print("All 20 Treasure Imp sprites have transparent 80x80 canvases and valid artwork.")
