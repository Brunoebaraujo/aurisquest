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
for y in range(320, 500):
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


def rectangular_part(name: str, box: tuple[int, int, int, int]) -> None:
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).rectangle(box, fill=255)
    output_with_mask(mask, name)


def polygon_part(name: str, points: list[tuple[int, int]]) -> None:
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    output_with_mask(mask, name)


# Full base-body kit for the Composer laboratory. Adjacent pieces intentionally
# overlap by a few pixels at joints; identical source pixels make the default
# reconstruction seamless and allow independent repositioning afterwards.
polygon_part("maya_torso_base_v1.png", [(350, 345), (675, 345), (655, 790), (375, 790)])
polygon_part("maya_right_arm_base_v1.png", [(345, 390), (445, 420), (405, 755), (315, 790), (235, 720), (305, 500)])
polygon_part("maya_left_arm_base_v1.png", [(580, 420), (680, 390), (720, 500), (790, 720), (710, 790), (620, 755)])
rectangular_part("maya_right_hand_base_v1.png", (225, 735, 335, 900))
rectangular_part("maya_left_hand_base_v1.png", (680, 735, 790, 900))
polygon_part("maya_hips_base_v1.png", [(375, 720), (650, 720), (650, 855), (375, 855)])
polygon_part("maya_right_leg_base_v1.png", [(350, 760), (520, 760), (500, 1265), (315, 1265)])
polygon_part("maya_left_leg_base_v1.png", [(505, 760), (675, 760), (710, 1265), (525, 1265)])
rectangular_part("maya_right_shoe_base_v1.png", (235, 1215, 470, 1410))
rectangular_part("maya_left_shoe_base_v1.png", (555, 1215, 790, 1410))

print(ASSETS / "maya_head_neck_front_v1.png")
print(ASSETS / "maya_hands_front_v1.png")
