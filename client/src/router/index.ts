import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import AnalyticsView from '../views/AnalyticsView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: AnalyticsView,
      meta: { requiresAuth: true },
    },
  ],
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  // 1. Handle Token from URL (Google Callback)
  if (to.query.token && typeof to.query.token === 'string') {
    authStore.login(to.query.token);
    
    // Remove token from URL for cleaner history
    // We redirect to the same path but without the query param
    next({ path: to.path, query: {}, replace: true });
    return;
  }

  // 2. Check Auth for Protected Routes
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Attempt to restore from localStorage first
    authStore.checkAuth();
    if (!authStore.isAuthenticated) {
      next({ name: 'login' });
      return;
    }
  }

  // 3. Prevent Logged-in Users from visiting Login
  if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'dashboard' });
    return;
  }

  next();
});

export default router;