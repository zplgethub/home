<template>
  <div id="top" class="site-shell">
    <header class="site-header page-width">
      <a class="brand" href="#top" aria-label="返回首页顶部">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>{{ siteName }}</span>
      </a>
      <nav class="header-nav" aria-label="页面导航">
        <a href="#sites">站点导航</a>
        <button type="button" @click="contactOpen = true">联系我</button>
      </nav>
    </header>

    <main class="page-width">
      <section class="hero" aria-label="个人主页">
        <MainLeft @open-contact="contactOpen = true" />
        <MainRight />
      </section>
      <Links />
    </main>

    <Footer />
    <ContactPanel :open="contactOpen" @close="contactOpen = false" />
  </div>
</template>

<script setup>
import { checkDays } from "@/utils/getTime.js";
import MainLeft from "@/views/Main/Left.vue";
import MainRight from "@/views/Main/Right.vue";
import Links from "@/components/Links.vue";
import Footer from "@/components/Footer.vue";
import ContactPanel from "@/components/ContactPanel.vue";

const siteName = import.meta.env.VITE_SITE_NAME || "flying 主页";
const contactOpen = ref(false);

onMounted(() => {
  checkDays();
});
</script>

<style lang="scss" scoped>
.site-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.site-header {
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid var(--line);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.brand-mark {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 0 5px var(--accent-soft);
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 30px;
  font-size: 0.85rem;

  a,
  button {
    position: relative;
    color: var(--muted);
    transition: color 180ms ease;
  }

  a::after,
  button::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: -7px;
    left: 0;
    height: 1px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 180ms ease;
  }

  a:hover,
  button:hover {
    color: var(--ink);

    &::after {
      transform: scaleX(1);
      transform-origin: left;
    }
  }
}

main {
  flex: 1;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(360px, 0.88fr);
  gap: clamp(48px, 7vw, 104px);
  align-items: stretch;
  padding: clamp(56px, 8vw, 104px) 0 clamp(64px, 8vw, 96px);
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
    gap: 40px;
  }
}

@media (max-width: 780px) {
  .site-header {
    min-height: 76px;
  }

  .hero {
    grid-template-columns: 1fr;
    gap: 56px;
    padding: 48px 0 64px;
  }
}

@media (max-width: 480px) {
  .site-header {
    gap: 16px;
  }

  .brand {
    max-width: 52%;
    line-height: 1.4;
  }

  .header-nav {
    gap: 18px;
    font-size: 0.8rem;
  }

  .hero {
    gap: 48px;
    padding-top: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-mark {
    box-shadow: none;
  }
}
</style>
