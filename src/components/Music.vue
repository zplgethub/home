<template>
  <div
    v-show="store.musicOpenState"
    id="music-panel"
    class="music"
    role="tabpanel"
    aria-labelledby="music-tab"
  >
    <div class="track">
      <span class="track-label">Now playing</span>
      <p class="track-name">
        {{
          store.getPlayerData.name
            ? `${store.getPlayerData.name} - ${store.getPlayerData.artist}`
            : store.musicIsOk
              ? "选择一首音乐"
              : musicLoadFailed
                ? "音乐服务暂不可用"
                : "歌单加载中…"
        }}
      </p>
    </div>

    <div class="control" aria-label="音乐播放控制">
      <button type="button" aria-label="上一首" @click="changeMusicIndex(0)">
        <go-start theme="filled" size="24" fill="currentColor" />
      </button>
      <button
        class="play-state"
        type="button"
        :aria-label="store.playerState ? '暂停' : '播放'"
        @click="changePlayState"
      >
        <pause v-if="store.playerState" theme="filled" size="30" fill="currentColor" />
        <play-one v-else theme="filled" size="30" fill="currentColor" />
      </button>
      <button type="button" aria-label="下一首" @click="changeMusicIndex(1)">
        <go-end theme="filled" size="24" fill="currentColor" />
      </button>
    </div>

    <div class="volume">
      <volume-mute v-if="volumeNum == 0" theme="filled" size="18" fill="currentColor" />
      <volume-small
        v-else-if="volumeNum > 0 && volumeNum < 0.7"
        theme="filled"
        size="18"
        fill="currentColor"
      />
      <volume-notice v-else theme="filled" size="18" fill="currentColor" />
      <el-slider
        v-model="volumeNum"
        aria-label="音量"
        :show-tooltip="false"
        :min="0"
        :max="1"
        :step="0.01"
        :disabled="!store.musicIsOk"
      />
      <span class="volume-value">{{ Math.round(volumeNum * 100) }}</span>
    </div>

    <button class="list-trigger" type="button" @click="openMusicList">
      <span>浏览播放列表</span>
      <span aria-hidden="true">↗</span>
    </button>
  </div>

  <Transition name="fade">
    <div
      v-show="musicListShow"
      class="music-list"
      role="dialog"
      aria-modal="true"
      aria-label="音乐播放列表"
      @click.self="closeMusicList"
    >
      <div class="list">
        <header class="list-header">
          <div>
            <span>PLAYLIST</span>
            <h2>播放列表</h2>
          </div>
          <button type="button" aria-label="关闭播放列表" @click="closeMusicList">
            <close-one theme="filled" size="24" fill="currentColor" />
          </button>
        </header>
        <Player
          ref="playerRef"
          :volume="volumeNum"
          :listFolded="true"
          :listMaxHeight="320"
          theme="#aa4b34"
          @loaded="musicLoadFailed = false"
          @error="musicLoadFailed = true"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup>
import {
  GoStart,
  PlayOne,
  Pause,
  GoEnd,
  CloseOne,
  VolumeMute,
  VolumeSmall,
  VolumeNotice,
} from "@icon-park/vue-next";
import Player from "@/components/Player.vue";
import { mainStore } from "@/store";

const store = mainStore();
const volumeNum = ref(store.musicVolume ? store.musicVolume : 0.7);
const musicListShow = ref(false);
const musicLoadFailed = ref(false);
const playerRef = ref(null);

const ensurePlayer = () => {
  if (playerRef.value && store.musicIsOk) return true;
  ElMessage({
    message: musicLoadFailed.value ? "音乐服务暂不可用，请稍后重试" : "音乐仍在加载，请稍后重试",
    grouping: true,
  });
  return false;
};

const openMusicList = () => {
  if (!ensurePlayer()) return;
  musicListShow.value = true;
  nextTick(() => {
    playerRef.value?.toggleList();
  });
};

const closeMusicList = () => {
  if (!musicListShow.value) return;
  musicListShow.value = false;
  playerRef.value?.toggleList();
};

const changePlayState = () => {
  if (ensurePlayer()) playerRef.value.playToggle();
};

const changeMusicIndex = (type) => {
  if (ensurePlayer()) playerRef.value.changeSong(type);
};

const handleKeydown = (event) => {
  if (event.key === "Escape" && musicListShow.value) closeMusicList();
};

watch(volumeNum, (value) => {
  store.musicVolume = value;
  playerRef.value?.changeVolume(value);
});

onMounted(() => {
  window.$openList = openMusicList;
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  delete window.$openList;
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style lang="scss" scoped>
.music {
  min-height: 238px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}

.track-label {
  color: var(--accent);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.track-name {
  overflow: hidden;
  margin-top: 7px;
  font-size: 0.85rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control {
  display: flex;
  align-items: center;
  gap: 22px;

  button {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: 50%;
    color: var(--muted);
    transition:
      border-color 180ms ease,
      color 180ms ease,
      transform 180ms ease;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-2px);
    }
  }

  .play-state {
    width: 50px;
    height: 50px;
    border-color: var(--ink);
    background: var(--ink);
    color: var(--paper-raised);

    &:hover {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--paper-raised);
    }
  }
}

.volume {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);

  .el-slider {
    flex: 1;
    --el-slider-main-bg-color: var(--accent);
    --el-slider-runway-bg-color: var(--line);
    --el-slider-button-size: 12px;
  }
}

.volume-value {
  width: 24px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.list-trigger {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--line-strong);
  color: var(--muted);
  font-size: 0.72rem;
  transition:
    border-color 180ms ease,
    color 180ms ease;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
}

.music-list {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(34 34 31 / 48%);
}

.list {
  width: min(100%, 640px);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 30px;
  border: 1px solid var(--line);
  background: var(--paper-raised);
  box-shadow: 0 24px 80px rgb(34 34 31 / 18%);
}

.list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);

  span {
    color: var(--accent);
    font-size: 0.58rem;
    letter-spacing: 0.16em;
  }

  h2 {
    margin-top: 5px;
    font-family: Georgia, "Times New Roman", "Songti SC", serif;
    font-size: 1.8rem;
    font-weight: 400;
  }

  button {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    color: var(--muted);

    &:hover {
      color: var(--accent);
    }
  }
}

@media (max-width: 520px) {
  .music-list {
    padding: 12px;
  }

  .list {
    max-height: calc(100dvh - 24px);
    padding: 22px 18px;
  }
}
</style>
