<template>
  <APlayer
    v-if="playList[0]"
    ref="player"
    :audio="playList"
    :autoplay="store.playerAutoplay"
    :theme="theme"
    :autoSwitch="false"
    :loop="store.playerLoop"
    :order="store.playerOrder"
    :volume="volume"
    :showLrc="hasLrc"
    :listFolded="listFolded"
    :listMaxHeight="listMaxHeight"
    :noticeSwitch="false"
    @play="onPlay"
    @pause="onPause"
    @timeupdate="onTimeUp"
    @error="loadMusicError"
  />
</template>

<script setup>
import { MusicOne, PlayWrong } from "@icon-park/vue-next";
import { getPlayerList } from "@/api";
import { mainStore } from "@/store";
import APlayer from "@worstone/vue-aplayer";

const store = mainStore();
const player = ref(null);
const playList = ref([]);
const playIndex = ref(0);

const props = defineProps({
  theme: {
    type: String,
    default: "#aa4b34",
  },
  volume: {
    type: Number,
    default: 0.7,
    validator: (value) => value >= 0 && value <= 1,
  },
  listFolded: {
    type: Boolean,
    default: false,
  },
  listMaxHeight: {
    type: Number,
    default: 420,
  },
});

const listHeight = computed(() => `${props.listMaxHeight}px`);
const hasLrc = computed(() => playList.value.some((song) => song.lrc));
const emit = defineEmits(["loaded", "error"]);

onMounted(async () => {
  await nextTick();
  try {
    const result = await getPlayerList();
    if (!result?.length) throw new Error("播放列表为空");
    playList.value = result;
    store.musicIsOk = true;
    emit("loaded");
  } catch (error) {
    console.error(error);
    store.musicIsOk = false;
    emit("error");
    ElMessage({
      message: "播放器加载失败，请稍后重试",
      grouping: true,
      icon: h(PlayWrong, {
        theme: "filled",
        fill: "#aa4b34",
      }),
    });
  }
});

const onPlay = () => {
  if (!player.value) return;
  playIndex.value = player.value.aplayer.index;
  store.setPlayerState(player.value.audioRef.paused);
  const current = playList.value[playIndex.value];
  if (!current) return;
  store.setPlayerData(current.name, current.artist);
  ElMessage({
    message: `${current.name} - ${current.artist}`,
    grouping: true,
    icon: h(MusicOne, {
      theme: "filled",
      fill: "#aa4b34",
    }),
  });
};

const onPause = () => {
  if (player.value) store.setPlayerState(player.value.audioRef.paused);
};

const onTimeUp = () => {
  if (!player.value) return;
  const lyrics = player.value.aplayer.lyrics[playIndex.value];
  const lyricIndex = player.value.aplayer.lyricIndex;
  if (!lyrics || !lyrics[lyricIndex]) return;
  let lrc = lyrics[lyricIndex][1];
  if (lrc === "Loading") lrc = "歌词加载中";
  if (lrc === "Not available") lrc = "歌词加载失败";
  store.setPlayerLrc(lrc);
};

const playToggle = () => {
  player.value?.toggle();
};

const changeVolume = (value) => {
  player.value?.setVolume(value, false);
};

const changeSong = (type) => {
  if (!player.value) return;
  type === 0 ? player.value.skipBack() : player.value.skipForward();
  nextTick(() => {
    player.value?.play();
  });
};

const toggleList = () => {
  player.value?.toggleList();
};

const loadMusicError = () => {
  const notice = playList.value.length > 1
    ? "播放歌曲出现错误，播放器将在 2s 后进行下一首"
    : "播放歌曲出现错误";
  ElMessage({
    message: notice,
    grouping: true,
    icon: h(PlayWrong, {
      theme: "filled",
      fill: "#aa4b34",
    }),
  });
};

defineExpose({ playToggle, changeVolume, changeSong, toggleList });
</script>

<style lang="scss" scoped>
.aplayer {
  width: 100%;
  margin: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ink);
  font-family: "HarmonyOS_Regular", "PingFang SC", sans-serif !important;

  :deep(.aplayer-body) {
    background: transparent;

    .aplayer-pic {
      display: none;
    }

    .aplayer-info {
      margin-left: 0;
      border-color: var(--line) !important;
      background: transparent;

      .aplayer-music {
        margin-bottom: 2px;
        overflow: hidden;

        .aplayer-title {
          color: var(--ink);
          font-size: 0.9rem;
        }

        .aplayer-author {
          color: var(--muted);
        }
      }

      .aplayer-lrc {
        height: 76px;
        margin: 12px 0;
        text-align: left;

        &::before,
        &::after {
          display: none;
        }

        p {
          color: var(--muted);
          font-size: 0.75rem;
        }

        .aplayer-lrc-current {
          color: var(--accent);
        }
      }

      .aplayer-controller {
        display: none;
      }
    }
  }

  :deep(.aplayer-list) {
    height: v-bind(listHeight);
    margin-top: 12px;
    background: transparent;

    ol {
      &::-webkit-scrollbar-track {
        background: transparent;
      }

      li {
        border-color: var(--line);
        color: var(--ink);

        &.aplayer-list-light {
          background: var(--accent-soft);
        }

        &:hover {
          background: var(--accent-soft) !important;
        }

        .aplayer-list-index,
        .aplayer-list-author {
          color: var(--muted);
        }
      }
    }
  }
}
</style>
