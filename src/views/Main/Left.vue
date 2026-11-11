<template>
  <section class="intro">
    <Message />
    <div class="intro-footer">
      <SocialLinks />
      <button class="contact-trigger" type="button" @click="emit('open-contact')">
        <span>联系我</span>
        <span aria-hidden="true">↗</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import Message from "@/components/Message.vue";
import SocialLinks from "@/components/SocialLinks.vue";

const emit = defineEmits(["open-contact"]);
</script>

<style lang="scss" scoped>
.intro {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 56px;
  animation: rise-in 420ms ease both;
}

.intro-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.contact-trigger {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 28px;
  padding: 12px 16px;
  border: 1px solid var(--ink);
  font-size: 0.82rem;
  transition:
    background-color 180ms ease,
    color 180ms ease;

  &:hover {
    background: var(--ink);
    color: var(--paper-raised);
  }
}

@media (max-width: 1060px) {
  .intro-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 780px) {
  .intro {
    gap: 40px;
  }

  .intro-footer {
    align-items: center;
    flex-direction: row;
  }
}

@media (max-width: 560px) {
  .intro-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 24px;
  }
}
</style>
