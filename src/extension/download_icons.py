import os

# Create icons directory if it doesn't exist
os.makedirs('public/icons', exist_ok=True)

# Simple download icon SVG
ICON_SVG = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
     viewBox="0 0 24 24">
  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
</svg>'''

try:
    # Save the SVG file
    svg_path = 'public/icons/icon.svg'
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(ICON_SVG)
    print('Created SVG icon')

except Exception as e:
    print(f'Error saving icon: {e}')
