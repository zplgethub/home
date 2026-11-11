<template>
  <aside class="right" aria-label="每日信息与音乐">
    <Func />
  </aside>
</template>

<script setup>
import Func from "@/views/Func/index.vue";
</script>

<style lang="scss" scoped>
.right {
  min-width: 0;
  animation: rise-in 420ms 80ms ease both;
}
</style>
