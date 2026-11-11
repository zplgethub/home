<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="open" class="contact-overlay" @click.self="close">
        <section
          ref="dialogRef"
          class="contact-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-title"
          tabindex="-1"
        >
          <header class="contact-header">
            <div>
              <p class="section-kicker">Stay in touch</p>
              <h2 id="contact-title">联系我</h2>
            </div>
            <button class="close-button" type="button" aria-label="关闭联系面板" @click="close">
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <p class="contact-intro">如果你有想法想交流，欢迎通过以下方式找到我。</p>

          <div class="contact-list">
            <div v-if="qqLink" class="contact-item">
              <div class="contact-copy">
                <span class="contact-label">QQ</span>
                <strong>{{ qqNumber || "通过 QQ 联系" }}</strong>
              </div>
              <div class="contact-actions">
                <button v-if="qqNumber" type="button" @click="copyText(qqNumber, 'qq')">
                  {{ copiedField === "qq" ? "已复制" : "复制号码" }}
                </button>
                <a :href="qqLink.url" target="_blank" rel="noopener noreferrer">打开 QQ ↗</a>
              </div>
            </div>

            <div v-if="emailLink" class="contact-item">
              <div class="contact-copy">
                <span class="contact-label">Email</span>
                <strong>{{ emailAddress }}</strong>
              </div>
              <div class="contact-actions">
                <button type="button" @click="copyText(emailAddress, 'email')">
                  {{ copiedField === "email" ? "已复制" : "复制邮箱" }}
                </button>
                <a :href="emailLink.url">写邮件 ↗</a>
              </div>
            </div>

            <div v-if="wechatId || wechatQr" class="contact-item wechat-item">
              <div class="contact-copy">
                <span class="contact-label">WeChat</span>
                <strong>{{ wechatId || "扫码添加微信" }}</strong>
              </div>
              <div class="contact-actions">
                <button v-if="wechatId" type="button" @click="copyText(wechatId, 'wechat')">
                  {{ copiedField === "wechat" ? "已复制" : "复制微信号" }}
                </button>
              </div>
              <img v-if="wechatQr" class="wechat-qr" :src="wechatQr" alt="微信联系二维码" />
            </div>
          </div>

          <p class="contact-note">这里仅展示联系方式，不会在网页中提交或保存你的信息。</p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import socialLinks from "@/assets/socialLinks.json";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["close"]);

const dialogRef = ref(null);
const copiedField = ref("");
let previousActiveElement = null;
let copiedTimer = null;

const qqLink = computed(() => socialLinks.find((item) => item.name === "QQ"));
const emailLink = computed(() => socialLinks.find((item) => item.name === "Email"));
const qqNumber = computed(() => {
  if (!qqLink.value) return "";
  try {
    return new URL(qqLink.value.url).searchParams.get("qq") || "";
  } catch {
    return "";
  }
});
const emailAddress = computed(() => emailLink.value?.url.replace(/^mailto:/, "") || "");
const wechatId = import.meta.env.VITE_CONTACT_WECHAT?.trim();
const wechatQr = import.meta.env.VITE_CONTACT_WECHAT_QR?.trim();

const close = () => {
  emit("close");
};

const markCopied = (field) => {
  copiedField.value = field;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copiedField.value = "";
  }, 1800);
};

const fallbackCopy = (value) => {
  const activeElement = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand("copy");
  textarea.remove();
  activeElement?.focus();
  if (!succeeded) throw new Error("浏览器不支持复制");
};

const copyText = async (value, field) => {
  if (!value) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      fallbackCopy(value);
    }
    markCopied(field);
  } catch {
    try {
      fallbackCopy(value);
      markCopied(field);
    } catch {
      ElMessage({
        type: "error",
        message: "复制失败，请手动复制",
        grouping: true,
      });
    }
  }
};

const handleKeydown = (event) => {
  if (!props.open) return;
  if (event.key === "Escape") {
    close();
    return;
  }
  if (event.key !== "Tab" || !dialogRef.value) return;

  const focusable = Array.from(
    dialogRef.value.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusable.length) {
    event.preventDefault();
    dialogRef.value.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && [first, dialogRef.value].includes(document.activeElement)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previousActiveElement = document.activeElement;
      document.body.style.overflow = "hidden";
      copiedField.value = "";
      await nextTick();
      dialogRef.value?.focus();
    } else {
      document.body.style.overflow = "";
      previousActiveElement?.focus();
    }
  },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
  clearTimeout(copiedTimer);
});
</script>

<style lang="scss" scoped>
.contact-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(34 34 31 / 48%);
}

.contact-dialog {
  width: min(100%, 580px);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: clamp(28px, 5vw, 48px);
  border: 1px solid var(--line);
  background: var(--paper-raised);
  box-shadow: 0 24px 80px rgb(34 34 31 / 18%);
}

.contact-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;

  h2 {
    margin-top: 18px;
    font-family: Georgia, "Times New Roman", "Songti SC", serif;
    font-size: clamp(2.4rem, 6vw, 3.6rem);
    font-weight: 400;
    line-height: 1.1;
  }
}

.close-button {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  color: var(--muted);
  font-family: Arial, sans-serif;
  font-size: 1.6rem;
  line-height: 1;
  transition:
    border-color 180ms ease,
    color 180ms ease;

  &:hover {
    border-color: var(--ink);
    color: var(--ink);
  }
}

.contact-intro {
  max-width: 400px;
  margin-top: 22px;
  color: var(--muted);
  font-size: 0.9rem;
}

.contact-list {
  margin-top: 34px;
  border-top: 1px solid var(--line);
}

.contact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 0;
  border-bottom: 1px solid var(--line);
}

.contact-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;

  strong {
    font-size: 0.92rem;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
}

.contact-label {
  color: var(--accent);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.contact-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;

  a,
  button {
    padding-bottom: 2px;
    border-bottom: 1px solid var(--line-strong);
    color: var(--muted);
    font-size: 0.75rem;
    white-space: nowrap;
    transition:
      border-color 180ms ease,
      color 180ms ease;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }
}

.wechat-item {
  flex-wrap: wrap;
}

.wechat-qr {
  width: 180px;
  margin-top: 8px;
  border: 1px solid var(--line);
}

.contact-note {
  margin-top: 22px;
  color: var(--muted);
  font-size: 0.72rem;
}

@media (max-width: 520px) {
  .contact-overlay {
    padding: 12px;
  }

  .contact-dialog {
    max-height: calc(100dvh - 24px);
    padding: 28px 22px;
  }

  .contact-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .contact-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
