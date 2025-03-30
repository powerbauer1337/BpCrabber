import { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import { TrackInfo, DownloadHistory } from '@shared/types';
import { DownloadList } from '@components/DownloadList';
import { SearchBar } from '@components/SearchBar';
import { HistoryList } from '@components/HistoryList';
import { Settings } from '@components/Settings';
import { Box } from '@chakra-ui/react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/tabs';

export const App = () => {
  const [activeDownloads, setActiveDownloads] = useState<TrackInfo[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([]);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    // Load initial state
    ipcRenderer.invoke('getActiveDownloads').then((downloads: TrackInfo[]) => {
      setActiveDownloads(downloads);
    });

    ipcRenderer.invoke('getDownloadHistory').then((history: DownloadHistory[]) => {
      setDownloadHistory(history);
    });

    // Set up event listeners
    const handleDownloadProgress = (_: unknown, track: TrackInfo) => {
      setActiveDownloads(prev => prev.map(t => (t.id === track.id ? track : t)));
    };

    const handleDownloadComplete = (_: unknown, track: TrackInfo & { path: string }) => {
      setActiveDownloads(prev => prev.filter(t => t.id !== track.id));
      setDownloadHistory(prev => [
        ...prev,
        {
          id: track.id,
          url: track.url,
          title: track.title,
          artist: track.artist,
          downloadedAt: new Date().toISOString(),
          path: track.path,
        },
      ]);
    };

    ipcRenderer.on('download:progress', handleDownloadProgress);
    ipcRenderer.on('download:complete', handleDownloadComplete);

    return () => {
      ipcRenderer.removeListener('download:progress', handleDownloadProgress);
      ipcRenderer.removeListener('download:complete', handleDownloadComplete);
    };
  }, []);

  return (
    <Box className="container mx-auto p-4">
      <Tabs index={tabIndex} onChange={setTabIndex}>
        <TabList>
          <Tab>Downloads</Tab>
          <Tab>History</Tab>
          <Tab>Settings</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <SearchBar />
            <DownloadList downloads={activeDownloads} />
          </TabPanel>

          <TabPanel>
            <HistoryList history={downloadHistory} />
          </TabPanel>

          <TabPanel>
            <Settings />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default App;
