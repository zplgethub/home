<template>
  <nav class="social" aria-label="社交链接">
    <a
      v-for="item in socialLinks"
      :key="item.name"
      :href="item.url"
      :title="item.tip"
      :target="isExternal(item.url) ? '_blank' : undefined"
      :rel="isExternal(item.url) ? 'noopener noreferrer' : undefined"
      :aria-label="`${item.name}：${item.tip}`"
    >
      <span>{{ item.name }}</span>
      <span class="arrow" aria-hidden="true">↗</span>
    </a>
  </nav>
</template>

<script setup>
import socialLinks from "@/assets/socialLinks.json";

const isExternal = (url) => /^https?:\/\//.test(url);
</script>

<style lang="scss" scoped>
.social {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 0;
    border-bottom: 1px solid transparent;
    color: var(--muted);
    font-size: 0.78rem;
    transition:
      border-color 180ms ease,
      color 180ms ease;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }

  .arrow {
    font-size: 0.7rem;
  }
}
</style>
