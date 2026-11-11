<template>
  <div class="weather" aria-live="polite">
    <template v-if="weatherStatus === 'success'">
      <span class="city">{{ weatherData.city }}</span>
      <span>{{ weatherData.weather }}</span>
      <span class="temperature">{{ weatherData.temperature }}℃</span>
      <span class="wind">
        {{ weatherData.winddirection }}
        {{ weatherData.windpower }} 级
      </span>
    </template>
    <span v-else-if="weatherStatus === 'loading'" class="weather-status">正在获取当地天气…</span>
    <span v-else class="weather-status">天气数据暂不可用</span>
  </div>
</template>

<script setup>
import { getGeocoding, getWeather } from "@/api";
import { Error } from "@icon-park/vue-next";

const weatherCity = import.meta.env.VITE_WEATHER_CITY || "北京";
const weatherStatus = ref("loading");
const weatherData = reactive({
  city: "",
  weather: "",
  temperature: null,
  winddirection: "",
  windpower: null,
});

// WMO 天气代码对照
const weatherTextMap = {
  0: "晴",
  1: "大部晴朗",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "雾凇",
  51: "毛毛雨",
  53: "小雨",
  55: "中雨",
  56: "冻毛毛雨",
  57: "冻雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "强冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "米雪",
  80: "阵雨",
  81: "强阵雨",
  82: "暴雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷阵雨",
  96: "雷阵雨伴冰雹",
  99: "强雷暴伴冰雹",
};

// 风向角度转中文
const getWindDirection = (degree) => {
  const directions = ["北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风"];
  return directions[Math.round(Number(degree) / 45) % 8];
};

// 风速（km/h）转风力等级
const getWindPower = (speed) => {
  const levels = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  return levels.findIndex((limit) => Number(speed) < limit) === -1
    ? 12
    : levels.findIndex((limit) => Number(speed) < limit);
};

const getWeatherData = async () => {
  try {
    const geocoding = await getGeocoding(weatherCity);
    const location = geocoding.results?.[0];
    if (!location) throw new Error("城市查询失败");

    const result = await getWeather(location.latitude, location.longitude);
    const current = result.current;

    weatherData.city = location.name;
    weatherData.weather = weatherTextMap[current.weather_code] || "未知天气";
    weatherData.temperature = Math.round(current.temperature_2m);
    weatherData.winddirection = getWindDirection(current.wind_direction_10m);
    weatherData.windpower = getWindPower(current.wind_speed_10m);
    weatherStatus.value = "success";
  } catch (error) {
    weatherStatus.value = "error";
    console.error("天气信息获取失败:" + error);
    ElMessage({
      message: "天气信息获取失败",
      grouping: true,
      icon: h(Error, {
        theme: "filled",
        fill: "#aa4b34",
      }),
    });
  }
};

onMounted(() => {
  getWeatherData();
});
</script>

<style lang="scss" scoped>
.weather {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin-top: 24px;
  color: var(--muted);
  font-size: 0.74rem;
}

.city {
  color: var(--ink);
  font-weight: 600;
}

.temperature {
  color: var(--accent);
}

.wind {
  padding-left: 12px;
  border-left: 1px solid var(--line);
}

.weather-status {
  color: var(--muted);
}

@media (max-width: 480px) {
  .wind {
    width: 100%;
    padding-left: 0;
    border-left: 0;
  }
}
</style>
