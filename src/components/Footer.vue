<template>
  <footer class="site-footer page-width">
    <Transition name="fade" mode="out-in">
      <div v-if="store.playerState && store.playerLrcShow" class="lrc">
        <music-one theme="filled" size="16" fill="currentColor" />
        <span class="lrc-text text-hidden">{{ store.getPlayerLrc }}</span>
        <music-one theme="filled" size="16" fill="currentColor" />
      </div>
      <div v-else class="footer-content">
        <p>
          ©
          <span v-if="startYear && startYear < fullYear">{{ startYear }}–</span>{{ fullYear }}
          <a :href="siteUrl" target="_blank" rel="noopener noreferrer">{{ siteAuthor }}</a>
        </p>
        <p class="credits">
          <span>
            Made by
            <a :href="config.github" target="_blank" rel="noopener noreferrer">{{ config.author }}</a>
          </span>
          <a
            v-if="siteIcp"
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ siteIcp }}
          </a>
        </p>
      </div>
    </Transition>
  </footer>
</template>

<script setup>
import { MusicOne } from "@icon-park/vue-next";
import { mainStore } from "@/store";
import config from "@/../package.json";

const store = mainStore();
const fullYear = new Date().getFullYear();
const startYear = import.meta.env.VITE_SITE_START?.length >= 4
  ? Number(import.meta.env.VITE_SITE_START.substring(0, 4))
  : null;
const siteIcp = import.meta.env.VITE_SITE_ICP;
const siteAuthor = import.meta.env.VITE_SITE_AUTHOR || "flying";
const siteUrl = computed(() => {
  const url = import.meta.env.VITE_SITE_URL || "xzqf.nyc.mn";
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
});
</script>

<style lang="scss" scoped>
.site-footer {
  min-height: 88px;
  display: flex;
  align-items: center;
  padding: 24px 0;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.7rem;
}

.footer-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  a {
    color: var(--ink);
    transition: color 180ms ease;

    &:hover {
      color: var(--accent);
    }
  }
}

.credits {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px 20px;
  text-align: right;
}

.lrc {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--accent);

  .lrc-text {
    max-width: min(70vw, 680px);
  }
}

@media (max-width: 620px) {
  .footer-content {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .credits {
    justify-content: flex-start;
    text-align: left;
  }
}
</style>
