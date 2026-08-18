from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/appointment/assets/images/icon.png')
image = Image.open(source).convert('RGBA')
image.thumbnail((512, 512), Image.Resampling.LANCZOS)
for name in ('icon.png', 'splash-icon.png', 'favicon.png', 'android-icon-foreground.png'):
    image.save(Path('/home/ubuntu/appointment/assets/images') / name, optimize=True)
