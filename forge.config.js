module.exports = {
  packagerConfig: {
    name: 'Beatport Downloader',
    executableName: 'beatport-downloader',
    icon: './assets/icon',
    asar: true,
    osxSign: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    },
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'beatport-downloader',
        authors: 'Beatport Downloader Team',
        exe: 'beatport-downloader.exe',
        setupIcon: './assets/icon.ico',
        certificateFile: process.env.WINDOWS_SIGN_CERT,
        certificatePassword: process.env.WINDOWS_SIGN_PASS
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'beatport-downloader',
          productName: 'Beatport Downloader',
          maintainer: 'Beatport Downloader Team',
          homepage: 'https://github.com/yourusername/beatport-downloader',
          icon: './assets/icon.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'beatport-downloader',
          productName: 'Beatport Downloader',
          maintainer: 'Beatport Downloader Team',
          homepage: 'https://github.com/yourusername/beatport-downloader',
          icon: './assets/icon.png',
        },
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'yourusername',
          name: 'beatport-downloader',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main.ts',
            config: 'vite.main.config.ts'
          },
          {
            entry: 'src/preload.ts',
            config: 'vite.preload.config.ts'
          }
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts'
          }
        ]
      },
    },
  ],
};
