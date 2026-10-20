<template>
  <section class="not-found">
    <h1>Esta página no existe</h1>
    <p>Revisa la dirección o vuelve a la lista de productos.</p>
    <RouterLink :to="{ name: 'products' }" class="btn btn--primary">Ver productos</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  display: grid;
  gap: var(--s-4);
  justify-items: start;
  padding-top: var(--s-6);
}
</style>
