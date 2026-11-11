<template>
  <div
    v-show="!store.musicOpenState"
    id="quote-panel"
    class="hitokoto"
    role="tabpanel"
    aria-labelledby="quote-tab"
  >
    <Transition name="fade" mode="out-in">
      <blockquote :key="hitokotoData.text" class="quote">
        <p>“{{ hitokotoData.text }}”</p>
        <footer>— {{ hitokotoData.from }}</footer>
      </blockquote>
    </Transition>
    <button class="refresh" type="button" @click="updateHitokoto">
      <span>换一句</span>
      <span aria-hidden="true">↻</span>
    </button>
  </div>
</template>

<script setup>
import { Error } from "@icon-park/vue-next";
import { getHitokoto } from "@/api";
import { mainStore } from "@/store";
import debounce from "@/utils/debounce.js";

const store = mainStore();
const hitokotoData = reactive({
  text: "这里应该显示一句话",
  from: "無名",
});

const getHitokotoData = async () => {
  try {
    const result = await getHitokoto();
    hitokotoData.text = result.hitokoto;
    hitokotoData.from = result.from;
  } catch (error) {
    ElMessage({
      message: "一言获取失败",
      grouping: true,
      icon: h(Error, {
        theme: "filled",
        fill: "#aa4b34",
      }),
    });
    hitokotoData.text = "愿你今天也能发现一些小小的美好。";
    hitokotoData.from = "flying";
  }
};

const updateHitokoto = () => {
  debounce(() => {
    getHitokotoData();
  }, 500);
};

onMounted(() => {
  getHitokotoData();
});
</script>

<style lang="scss" scoped>
.hitokoto {
  min-height: 238px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
}

.quote {
  margin: 0;

  p {
    display: -webkit-box;
    overflow: hidden;
    font-family: Georgia, "Times New Roman", "Songti SC", serif;
    font-size: clamp(1.2rem, 2vw, 1.5rem);
    line-height: 1.75;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
  }

  footer {
    margin-top: 18px;
    color: var(--muted);
    font-size: 0.75rem;
    text-align: right;
  }
}

.refresh {
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
</style>
