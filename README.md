# Beatport Downloader

An Electron-based desktop application for downloading and managing your Beatport music collection.

## Features

- Modern Material-UI based interface with dark mode support
- Track downloading from Beatport URLs
- Download queue management
- Track metadata management
- Progress tracking and logging
- Cross-platform support (Windows, macOS, Linux)

## Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd beatport-downloader
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Development

Start the development server:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # React components
├── main/          # Electron main process
├── renderer/      # Electron renderer process
├── preload/       # Preload scripts
├── stores/        # State management
├── services/      # Business logic
├── utils/         # Utility functions
└── theme.ts       # UI theme configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
