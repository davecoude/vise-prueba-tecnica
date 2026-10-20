import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** Ruta accesible sin sesión. */
    public?: boolean;
    title?: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/ingresar',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: 'Ingresar' },
    },
    { path: '/', redirect: { name: 'products' } },
    {
      path: '/productos',
      name: 'products',
      component: () => import('@/views/ProductsView.vue'),
      meta: { title: 'Productos' },
    },
    {
      path: '/productos/:id(\\d+)',
      name: 'product-detail',
      component: () => import('@/views/ProductDetailView.vue'),
      props: (route) => ({ id: Number(route.params.id) }),
      meta: { title: 'Kardex' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Página no encontrada' },
    },
  ],
});

// Guard de navegación: la UI espeja el control de acceso de la API
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'products' };
  }
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Inventario VISE` : 'Inventario VISE';
});
