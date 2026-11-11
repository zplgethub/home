<template>
  <div class="message">
    <p class="section-kicker">Personal homepage</p>

    <div class="identity">
      <div class="title-row">
        <h1>{{ siteAuthor }}</h1>
        <img class="avatar" :src="siteLogo" :alt="`${siteAuthor} 的头像`" />
      </div>
      <a class="site-url" :href="siteLink" target="_blank" rel="noopener noreferrer">
        {{ siteUrl }}
        <span aria-hidden="true">↗</span>
      </a>
    </div>

    <div class="description">
      <p class="hello">{{ descriptionHello }}</p>
      <p class="text">{{ descriptionText }}</p>
    </div>
  </div>
</template>

<script setup>
const siteLogo = import.meta.env.VITE_SITE_MAIN_LOGO || "/images/icon/logo.png";
const siteAuthor = import.meta.env.VITE_SITE_AUTHOR || "flying";
const descriptionHello = import.meta.env.VITE_DESC_HELLO || "欢迎你的访问！";
const descriptionText = import.meta.env.VITE_DESC_TEXT || "flying 的主页小屋";

const siteUrl = computed(() => {
  const url = import.meta.env.VITE_SITE_URL || "xzqf.nyc.mn";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
});

const siteLink = computed(() => {
  const url = import.meta.env.VITE_SITE_URL || "xzqf.nyc.mn";
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
});
</script>

<style lang="scss" scoped>
.message {
  max-width: 680px;
}

.identity {
  margin-top: clamp(32px, 5vw, 60px);
}

.title-row {
  display: flex;
  align-items: center;
  gap: clamp(20px, 3vw, 36px);

  h1 {
    max-width: 100%;
    font-family: Georgia, "Times New Roman", "Songti SC", serif;
    font-size: clamp(4.8rem, 9vw, 8.6rem);
    font-weight: 400;
    letter-spacing: -0.065em;
    line-height: 0.92;
    overflow-wrap: anywhere;
  }
}

.avatar {
  flex: none;
  width: clamp(58px, 6vw, 76px);
  height: clamp(58px, 6vw, 76px);
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 50%;
  filter: saturate(0.75);
}

.site-url {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 26px;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--line-strong);
  color: var(--muted);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  transition:
    border-color 180ms ease,
    color 180ms ease;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
}

.description {
  max-width: 470px;
  margin-top: clamp(48px, 7vw, 76px);
  padding-left: 24px;
  border-left: 2px solid var(--accent);
}

.hello {
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: clamp(1.55rem, 2.6vw, 2.15rem);
  line-height: 1.35;
}

.text {
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.98rem;
  line-height: 1.9;
}

@media (max-width: 960px) {
  .title-row {
    align-items: flex-start;
    flex-direction: column-reverse;
  }
}

@media (max-width: 780px) {
  .message {
    max-width: none;
  }

  .title-row {
    align-items: center;
    flex-direction: row;
  }

  .description {
    margin-top: 48px;
  }
}

@media (max-width: 480px) {
  .identity {
    margin-top: 32px;
  }

  .title-row {
    gap: 18px;

    h1 {
      font-size: clamp(4rem, 21vw, 6rem);
    }
  }

  .avatar {
    width: 52px;
    height: 52px;
  }

  .site-url {
    margin-top: 22px;
  }

  .description {
    margin-top: 40px;
    padding-left: 18px;
  }
}
</style>
