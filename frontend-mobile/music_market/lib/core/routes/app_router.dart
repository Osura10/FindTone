import 'package:go_router/go_router.dart';
import '../../features/splash/screens/splash_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/marketplace/screens/listing_details_screen.dart';
import '../../features/buyer/screens/checkout_screen.dart';
import '../../features/buyer/screens/order_success_screen.dart';
import '../../features/buyer/screens/my_orders_screen.dart';
import '../../features/shop/models/order_model.dart';
import '../../features/alerts/screens/my_alerts_screen.dart';
import '../../features/shop/screens/sales_screen.dart';
import '../../features/shop/screens/create_post_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/wishlist/screens/wishlist_screen.dart';
import '../../features/auth/providers/auth_provider.dart';

/// Home route for a role. Buyers and shops have the same features; only the path differs.
String homeFor(String? role) => role == 'shop' ? '/shop_home' : '/buyer_home';

/// Pure redirect rule (no Flutter, easy to unit test).
/// - while the saved login is being checked: stay on the splash screen
/// - logged out: only /login and /register
/// - logged in: never on splash/login/register, and each role uses its own home path
/// - admins are never logged in on mobile (AuthProvider refuses them); send them to /login
String? authRedirect({
  required bool loading,
  required bool loggedIn,
  required String? role,
  required String location,
}) {
  const publicPages = {'/login', '/register'};

  if (loading) return location == '/' ? null : '/';

  if (!loggedIn || role == null || role == 'admin') {
    return publicPages.contains(location) ? null : '/login';
  }

  if (location == '/' || publicPages.contains(location)) return homeFor(role);
  if (location == '/buyer_home' && role == 'shop') return '/shop_home';
  if (location == '/shop_home' && role == 'buyer') return '/buyer_home';
  return null;
}

class AppRouter {
  static GoRouter? _router;
  static GoRouter get router => _router!;

  static GoRouter getRouter(AuthProvider authProvider) {
    _router ??= GoRouter(
      initialLocation: '/',
      refreshListenable: authProvider,
      redirect: (context, state) => authRedirect(
        loading: authProvider.isAuthLoading,
        loggedIn: authProvider.isAuthenticated,
        role: authProvider.role,
        location: state.matchedLocation,
      ),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
        GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
        GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
        GoRoute(path: '/buyer_home', builder: (context, state) => const HomeScreen()),
        GoRoute(path: '/shop_home', builder: (context, state) => const HomeScreen()),
        GoRoute(
          path: '/listing/:id',
          builder: (context, state) => ListingDetailsScreen(id: int.tryParse(state.pathParameters['id'] ?? '') ?? 0),
        ),
        GoRoute(
          path: '/checkout/:id',
          builder: (context, state) => CheckoutScreen(listingId: int.tryParse(state.pathParameters['id'] ?? '') ?? 0),
        ),
        GoRoute(
          path: '/order_success/:orderId',
          builder: (context, state) => OrderSuccessScreen(
            orderId: int.tryParse(state.pathParameters['orderId'] ?? '') ?? 0,
            order: state.extra is OrderModel ? state.extra as OrderModel : null,
          ),
        ),
        GoRoute(path: '/my_orders', builder: (context, state) => const MyOrdersScreen()),
        GoRoute(path: '/my_alerts', builder: (context, state) => const MyAlertsScreen()),
        GoRoute(path: '/sales', builder: (context, state) => const SalesScreen()),
        GoRoute(path: '/wishlist', builder: (context, state) => const WishlistScreen()),
        GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
        GoRoute(path: '/shop/create', builder: (context, state) => const CreatePostScreen()),
        GoRoute(
          path: '/shop/edit/:id',
          builder: (context, state) => CreatePostScreen(listingId: int.tryParse(state.pathParameters['id'] ?? '')),
        ),
      ],
    );
    return _router!;
  }
}
