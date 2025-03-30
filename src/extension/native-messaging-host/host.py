#!/usr/bin/env python3
import json
import struct
import sys
import subprocess
from pathlib import Path


def read_message():
    """Read a message from the browser extension."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length)
    return json.loads(message.decode('utf-8'))


def send_message(message):
    """Send a message to the browser extension."""
    encoded_message = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('=I', len(encoded_message))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()


def main():
    """Main function to handle native messaging."""
    # Set up logging
    log_file = Path.home() / '.beatportdl' / 'native-host.log'
    log_file.parent.mkdir(parents=True, exist_ok=True)

    while True:
        try:
            message = read_message()
            if message is None:
                break

            if message.get('action') == 'download':
                url = message.get('url')
                if url:
                    # Call beatportdl with the URL
                    result = subprocess.run(
                        ['beatportdl', url],
                        capture_output=True,
                        text=True
                    )

                    if result.returncode == 0:
                        send_message({
                            'success': True
                        })
                    else:
                        send_message({
                            'success': False,
                            'error': result.stderr
                        })
                else:
                    send_message({
                        'success': False,
                        'error': 'No URL provided'
                    })
            else:
                send_message({
                    'success': False,
                    'error': 'Unknown action'
                })

        except Exception as e:
            # Log error and send error response
            with open(log_file, 'a') as f:
                f.write(f'Error: {str(e)}\n')

            send_message({
                'success': False,
                'error': str(e)
            })


if __name__ == '__main__':
    main()
