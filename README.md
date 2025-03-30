# Beatport Downloader

A desktop application for downloading tracks from Beatport, built with Electron, React, and TypeScript.

## Features

- Download tracks from Beatport
- Track download progress
- Manage download settings
- View download history
- Dark mode UI
- Auto-updates

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/beatport-downloader.git
cd beatport-downloader
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add your configuration:

```bash
cp .env.example .env
```

## Development

Start the development server:

```bash
npm run dev
```

## Building

Build the application:

```bash
npm run build
```

Create platform-specific packages:

```bash
npm run make
```

## Configuration

The application can be configured through the settings panel or by editing the `.env` file:

- `DOWNLOAD_PATH`: Default download location
- `MAX_CONCURRENT_DOWNLOADS`: Maximum number of simultaneous downloads
- `AUTO_UPDATE_FEED_URL`: URL for auto-updates
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
