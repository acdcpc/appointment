from pathlib import Path
from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()

project = Path("/home/ubuntu/appointment")
source = Path("/home/ubuntu/upload/IMG_1548.heic")
images = project / "assets" / "images"
images.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert("RGB")
image.save(images / "rainbow-clinic-source.png", "PNG")

# The supplied document places the rainbow child symbol in the upper-left header.
width, height = image.size
left, top = int(width * 0.169), int(height * 0.077)
side = min(int(width * 0.133), height - top)
mark = image.crop((left, top, left + side, top + side)).resize((1024, 1024), Image.Resampling.LANCZOS)
for name in ("icon.png", "splash-icon.png", "favicon.png", "android-icon-foreground.png"):
    mark.save(images / name, "PNG")
