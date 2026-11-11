import musicPlaylist from "@/assets/music-playlist.json";

/**
 * 音乐播放器
 * 使用本地歌单，音频为可自由使用的开源示例作品（SoundHelix）
 */

// 获取音乐播放列表
export const getPlayerList = async () =>
  musicPlaylist.map((song) => ({
    name: song.name,
    artist: song.artist,
    url: song.url,
    cover: song.cover,
    lrc: song.lrc || "",
  }));

/**
 * 一言
 */

// 获取一言数据
export const getHitokoto = async () => {
  const res = await fetch("https://v1.hitokoto.cn");
  return await res.json();
};

/**
 * 天气
 * 使用 Open-Meteo，开源、免 Key
 */

// 根据城市名称获取经纬度
export const getGeocoding = async (city) => {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,
  );
  return await res.json();
};

// 根据经纬度获取当前天气
export const getWeather = async (latitude, longitude) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`,
  );
  return await res.json();
};
