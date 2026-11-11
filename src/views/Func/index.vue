<template>
  <div class="dashboard">
    <div class="dashboard-heading">
      <p class="section-kicker">Daily brief</p>
      <span class="edition">No. 02</span>
    </div>

    <section class="time-block" aria-label="当前日期、时间与天气">
      <p class="date">
        {{ currentTime.year }} / {{ currentTime.month }} / {{ currentTime.day }}
        <span>·</span>
        {{ currentTime.weekday }}
      </p>
      <div class="clock" aria-live="off">
        <span>{{ currentTime.hour }}:{{ currentTime.minute }}</span>
        <span class="seconds">{{ currentTime.second }}</span>
      </div>
      <Weather />
    </section>

    <section class="content-panel">
      <div class="panel-tabs" role="tablist" aria-label="一言与音乐切换">
        <button
          id="quote-tab"
          type="button"
          role="tab"
          :aria-selected="!store.musicOpenState"
          aria-controls="quote-panel"
          :class="{ active: !store.musicOpenState }"
          @click="store.musicOpenState = false"
        >
          一言
        </button>
        <button
          v-if="hasPlaylist"
          id="music-tab"
          type="button"
          role="tab"
          :aria-selected="store.musicOpenState"
          aria-controls="music-panel"
          :class="{ active: store.musicOpenState }"
          @click="store.musicOpenState = true"
        >
          音乐
        </button>
        <span class="panel-hint">{{ store.musicOpenState ? "LISTEN & RELAX" : "A LINE A DAY" }}</span>
      </div>
      <div class="panel-body">
        <Hitokoto />
        <Music v-if="hasPlaylist" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { getCurrentTime } from "@/utils/getTime";
import { mainStore } from "@/store";
import Music from "@/components/Music.vue";
import Hitokoto from "@/components/Hitokoto.vue";
import Weather from "@/components/Weather.vue";
import musicPlaylist from "@/assets/music-playlist.json";

const store = mainStore();
const currentTime = ref(getCurrentTime());
const timeInterval = ref(null);
const hasPlaylist = musicPlaylist.length > 0;

onMounted(() => {
  timeInterval.value = setInterval(() => {
    currentTime.value = getCurrentTime();
  }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timeInterval.value);
});
</script>

<style lang="scss" scoped>
.dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dashboard-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ink);
}

.edition {
  color: var(--muted);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.72rem;
  font-style: italic;
}

.time-block {
  padding: 30px 0 34px;
}

.date {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--muted);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
}

.clock {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 12px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(4rem, 6.4vw, 6.3rem);
  letter-spacing: -0.065em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.seconds {
  color: var(--accent);
  font-size: 0.9rem;
  letter-spacing: 0.06em;
}

.content-panel {
  margin-top: auto;
}

.panel-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid var(--line);

  button {
    position: relative;
    padding: 0 0 13px;
    color: var(--muted);
    font-size: 0.8rem;
    transition: color 180ms ease;

    &::after {
      content: "";
      position: absolute;
      right: 0;
      bottom: -1px;
      left: 0;
      height: 2px;
      background: var(--accent);
      transform: scaleX(0);
      transition: transform 180ms ease;
    }

    &:hover,
    &.active {
      color: var(--ink);
    }

    &.active::after {
      transform: scaleX(1);
    }
  }
}

.panel-hint {
  margin-left: auto;
  color: var(--muted);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
}

.panel-body {
  min-height: 264px;
  padding-top: 26px;
}

@media (max-width: 960px) {
  .clock {
    font-size: clamp(3.5rem, 7vw, 4.8rem);
  }

  .panel-hint {
    display: none;
  }
}

@media (max-width: 780px) {
  .dashboard {
    min-height: 540px;
  }

  .clock {
    font-size: clamp(4.4rem, 17vw, 6.5rem);
  }
}

@media (max-width: 380px) {
  .clock {
    font-size: 4.2rem;
  }
}
</style>
