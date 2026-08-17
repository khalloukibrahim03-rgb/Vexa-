export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  video_files: PexelsVideoFile[];
}

/**
 * Searches Pexels API for free stock HD video clips matching scene topics.
 */
export async function searchStockVideos(query: string, apiKey?: string): Promise<string[]> {
  const pexelsKey = apiKey || process.env['PEXELS_API_KEY'];

  if (!pexelsKey) {
    // Return high quality public domain/stock video placeholders if API key is unconfigured
    return [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    ];
  }

  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;

  const response = await fetch(url, {
    headers: {
      Authorization: pexelsKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();
  const videos: PexelsVideo[] = json.videos || [];

  const videoUrls: string[] = [];
  for (const video of videos) {
    const hdFile = video.video_files.find((f) => f.width >= 1280 || f.quality === 'hd');
    if (hdFile) {
      videoUrls.push(hdFile.link);
    } else if (video.video_files.length > 0) {
      videoUrls.push(video.video_files[0].link);
    }
  }

  return videoUrls;
}
