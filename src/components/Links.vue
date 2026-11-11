<template>
  <section v-if="siteLinks.length" id="sites" class="links" aria-labelledby="sites-title">
    <header class="links-header">
      <div>
        <p class="section-kicker">Explore more</p>
        <h2 id="sites-title">站点导航</h2>
      </div>
      <span class="link-count">{{ String(siteLinks.length).padStart(2, "0") }} destinations</span>
    </header>

    <div class="link-grid">
      <a
        v-for="(item, index) in siteLinks"
        :key="item.name"
        class="link-item"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        @click="jumpLink(item, $event)"
      >
        <span class="number">{{ String(index + 1).padStart(2, "0") }}</span>
        <span class="name">{{ item.name }}</span>
        <span class="hostname">{{ getHostname(item.link) }}</span>
        <span class="arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</template>

<script setup>
import { mainStore } from "@/store";
import siteLinks from "@/assets/siteLinks.json";

const store = mainStore();

const getHostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "访问站点";
  }
};

const jumpLink = (data, event) => {
  if (data.name === "音乐" && store.musicClick) {
    event.preventDefault();
    if (typeof window.$openList === "function") window.$openList();
  }
};
</script>

<style lang="scss" scoped>
.links {
  padding: clamp(56px, 7vw, 88px) 0 clamp(72px, 9vw, 112px);
  border-top: 1px solid var(--ink);
}

.links-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 42px;

  h2 {
    margin-top: 18px;
    font-family: Georgia, "Times New Roman", "Songti SC", serif;
    font-size: clamp(2.8rem, 5vw, 4.6rem);
    font-weight: 400;
    letter-spacing: -0.045em;
    line-height: 1.1;
  }
}

.link-count {
  padding-bottom: 8px;
  color: var(--muted);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.7rem;
  font-style: italic;
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: clamp(32px, 6vw, 80px);
  border-top: 1px solid var(--line);
}

.link-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 34px minmax(80px, 0.7fr) minmax(0, 1fr) 20px;
  align-items: center;
  gap: 14px;
  padding: 24px 0;
  border-bottom: 1px solid var(--line);
  transition: color 180ms ease;

  &:hover {
    color: var(--accent);

    .arrow {
      transform: translate(2px, -2px);
    }

    .hostname {
      color: var(--accent);
    }
  }
}

.number {
  color: var(--muted);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.68rem;
}

.name {
  font-size: 0.94rem;
  font-weight: 600;
}

.hostname {
  overflow: hidden;
  color: var(--muted);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 180ms ease;
}

.arrow {
  justify-self: end;
  font-size: 0.85rem;
  transition: transform 180ms ease;
}

@media (max-width: 780px) {
  .link-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .links-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 30px;
  }

  .link-count {
    padding-bottom: 0;
  }

  .link-item {
    grid-template-columns: 26px minmax(64px, 0.7fr) minmax(0, 1fr) 16px;
    gap: 10px;
    padding: 20px 0;
  }
}

@media (max-width: 360px) {
  .hostname {
    display: none;
  }

  .link-item {
    grid-template-columns: 26px 1fr 16px;
  }
}
</style>
