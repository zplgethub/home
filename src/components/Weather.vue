<template>
  <div class="weather" aria-live="polite">
    <template v-if="weatherStatus === 'success'">
      <span class="city">{{ weatherData.adCode.city }}</span>
      <span>{{ weatherData.weather.weather }}</span>
      <span class="temperature">{{ weatherData.weather.temperature }}℃</span>
      <span class="wind">
        {{
          weatherData.weather.winddirection?.endsWith("风")
            ? weatherData.weather.winddirection
            : weatherData.weather.winddirection + "风"
        }}
        {{ weatherData.weather.windpower }} 级
      </span>
    </template>
    <span v-else-if="weatherStatus === 'loading'" class="weather-status">正在获取当地天气…</span>
    <span v-else class="weather-status">天气数据暂不可用</span>
  </div>
</template>

<script setup>
import { getAdcode, getWeather, getOtherWeather } from "@/api";
import { Error } from "@icon-park/vue-next";

const mainKey = import.meta.env.VITE_WEATHER_KEY;
const weatherStatus = ref("loading");
const weatherData = reactive({
  adCode: {
    city: null,
    adcode: null,
  },
  weather: {
    weather: null,
    temperature: null,
    winddirection: null,
    windpower: null,
  },
});

const getTemperature = (min, max) => {
  try {
    const average = (Number(min) + Number(max)) / 2;
    return Math.round(average);
  } catch (error) {
    console.error("计算温度出现错误：", error);
    return "NaN";
  }
};

const getWeatherData = async () => {
  try {
    if (!mainKey) {
      const result = await getOtherWeather();
      const data = result.result;
      weatherData.adCode = {
        city: data.city.City || "未知地区",
      };
      weatherData.weather = {
        weather: data.condition.day_weather,
        temperature: getTemperature(data.condition.min_degree, data.condition.max_degree),
        winddirection: data.condition.day_wind_direction,
        windpower: data.condition.day_wind_power,
      };
    } else {
      const adCode = await getAdcode(mainKey);
      if (adCode.infocode !== "10000") {
        throw new Error("地区查询失败");
      }
      weatherData.adCode = {
        city: adCode.city,
        adcode: adCode.adcode,
      };
      const result = await getWeather(mainKey, weatherData.adCode.adcode);
      weatherData.weather = {
        weather: result.lives[0].weather,
        temperature: result.lives[0].temperature,
        winddirection: result.lives[0].winddirection,
        windpower: result.lives[0].windpower,
      };
    }
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
