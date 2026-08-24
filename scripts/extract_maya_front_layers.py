from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "avatar-assets"
base = Image.open(ASSETS / "maya_avatar_base_v1.png").convert("RGBA")
pixels = base.load()


def output_with_mask(mask: Image.Image, name: str) -> None:
    original_alpha = base.getchannel("A")
    alpha = Image.new("L", base.size, 0)
    alpha_pixels = alpha.load()
    mask_pixels = mask.load()
    source_alpha = original_alpha.load()
    for y in range(base.height):
        for x in range(base.width):
            alpha_pixels[x, y] = min(source_alpha[x, y], mask_pixels[x, y])
    result = base.copy()
    result.putalpha(alpha)
    result.save(ASSETS / name)


# Head/hair are copied directly. Below the chin, color selection keeps only
# blonde hair and natural neck pixels, excluding the gray hood/collar.
head_mask = Image.new("L", base.size, 0)
draw = ImageDraw.Draw(head_mask)
draw.polygon([(315, 70), (705, 70), (705, 345), (675, 470), (570, 485), (550, 405), (475, 405), (450, 485), (320, 470), (300, 345)], fill=255)
hm = head_mask.load()
for y in range(340, 500):
    for x in range(285, 725):
        r, g, b, a = pixels[x, y]
        hair = (x < 455 or x > 575) and r > 115 and g > 65 and r > g * 1.05 and g > b * 1.12
        skin = y <= 405 and 450 <= x <= 575 and r > 145 and g > 75 and b > 55 and r > g * 1.05 and g > b * 1.03
        hm[x, y] = 255 if a and (hair or skin) else 0
output_with_mask(head_mask, "maya_head_neck_front_v1.png")


# Both relaxed hands are selected by position and skin color so hoodie cuffs
# never cover the armor bracers in the foreground layer.
hands_mask = Image.new("L", base.size, 0)
hand_regions = [(225, 720, 335, 900), (680, 720, 790, 900)]
hand_pixels = hands_mask.load()
for x0, y0, x1, y1 in hand_regions:
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = pixels[x, y]
            skin = r > 135 and g > 65 and r > g * 1.06 and g > b * 1.02
            if a and skin:
                hand_pixels[x, y] = 255

# A tiny soft edge restores antialiasing while original alpha remains the cap.
hands_mask = hands_mask.filter(ImageFilter.GaussianBlur(0.55))
output_with_mask(hands_mask, "maya_hands_front_v1.png")

print(ASSETS / "maya_head_neck_front_v1.png")
print(ASSETS / "maya_hands_front_v1.png")
