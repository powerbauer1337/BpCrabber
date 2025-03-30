from PIL import Image, ImageDraw
import os

# Create icons directory if it doesn't exist
os.makedirs('public/icons', exist_ok=True)

def create_icon(size):
    # Create a new image with a white background
    image = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)

    # Draw a simple download arrow
    margin = size // 4
    arrow_width = size - (2 * margin)

    # Arrow shaft
    shaft_width = arrow_width // 3
    shaft_left = (size - shaft_width) // 2
    shaft_top = margin
    shaft_bottom = size - margin - (arrow_width // 2)

    # Draw arrow shaft
    draw.rectangle(
        [shaft_left, shaft_top, shaft_left + shaft_width, shaft_bottom],
        fill=(0, 0, 0)
    )

    # Draw arrow head
    arrow_head_points = [
        (shaft_left - (arrow_width // 4), shaft_bottom),  # Left point
        (shaft_left + shaft_width + (arrow_width // 4), shaft_bottom),  # Right point
        ((size) // 2, size - margin)  # Bottom point
    ]
    draw.polygon(arrow_head_points, fill=(0, 0, 0))

    return image

# Create icons in different sizes
sizes = [16, 48, 128]

for size in sizes:
    icon = create_icon(size)
    icon.save(f'public/icons/icon{size}.png')
