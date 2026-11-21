"""Validate the extracted Treasure Imp sprite set without launching the game."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
NAMES = (
    "treasure blood relic merchant hoarder jackpot jewel alchemist vitality prosperity "
    "sigil arcane set enchanted mystic fortune celestial artisan abyssal prismatic"
).split()
SPRITES = ROOT / "assets" / "sprites" / "treasure-imps"

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

print("All 20 Treasure Imp sprites have transparent 80x80 canvases and valid artwork.")
