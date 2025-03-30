from PIL import Image
import cairosvg
import os

# Create icons directory if it doesn't exist
os.makedirs('public/icons', exist_ok=True)

# Convert SVG to different size PNGs
sizes = [16, 48, 128]

for size in sizes:
    output_file = f'public/icons/icon{size}.png'
    cairosvg.svg2png(
        url='public/icons/icon.svg',
        write_to=output_file,
        output_width=size,
        output_height=size
    )
    print(f'Created {output_file}')
