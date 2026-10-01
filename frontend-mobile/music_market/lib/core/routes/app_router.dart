import 'package:go_router/go_router.dart';
import '../../features/splash/screens/splash_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/buyer/screens/buyer_home_screen.dart';
import '../../features/shop/screens/shop_home_screen.dart';
import '../../features/marketplace/screens/listing_details_screen.dart';
import '../../features/buyer/screens/checkout_screen.dart';
import '../../features/buyer/screens/order_success_screen.dart';
import '../../features/buyer/screens/my_orders_screen.dart';
import '../../features/shop/models/order_model.dart';
import '../../features/marketplace/models/listing_model.dart';
import '../../features/alerts/screens/my_alerts_screen.dart';
import '../../features/shop/screens/sales_screen.dart';



import '../../features/auth/providers/auth_provider.dart';

class AppRouter {
  static GoRouter? _router;
  static GoRouter get router => _router!;

  static GoRouter getRouter(AuthProvider authProvider) {
    _router ??= GoRouter(
      initialLocation: '/',
      refreshListenable: authProvider,
      redirect: (context, state) {
        final isLoading = authProvider.isAuthLoading;
        final isLoggedIn = authProvider.isAuthenticated;
        final role = authProvider.role;
        final path = state.matchedLocation;

        if (isLoading) {
          return '/';
        }

        final isSplash = path == '/';
        final isLogin = path == '/login';
        final isRegister = path == '/register';

        if (!isLoggedIn) {
          if (isLogin || isRegister) return null;
          return '/login';
        }

        if (isSplash || isLogin || isRegister) {
          if (role == 'shop') return '/shop_home';
          if (role == 'buyer') return '/buyer_home';
        }

        final isShopRoute = path.startsWith('/shop_home') || path.startsWith('/sales');
        final isBuyerRoute = path.startsWith('/buyer_home') || path.startsWith('/checkout') || path.startsWith('/my_orders');

        if (role == 'shop' && isBuyerRoute) return '/shop_home';
        if (role == 'buyer' && isShopRoute) return '/buyer_home';

        return null;
      },
      routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/buyer_home',
        builder: (context, state) => const BuyerHomeScreen(),
      ),
      GoRoute(
        path: '/shop_home',
        builder: (context, state) => const ShopHomeScreen(),
      ),
      GoRoute(
        path: '/listing/:id',
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return ListingDetailsScreen(id: id);
        },
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => CheckoutScreen(listing: state.extra as ListingDetail),
      ),
      GoRoute(
        path: '/order_success',
        builder: (context, state) => OrderSuccessScreen(order: state.extra as OrderModel),
      ),
      GoRoute(
        path: '/my_orders',
        builder: (context, state) => const MyOrdersScreen(),
      ),
      GoRoute(
        path: '/my_alerts',
        builder: (context, state) => const MyAlertsScreen(),
      ),
      GoRoute(
        path: '/sales',
        builder: (context, state) => const SalesScreen(),
      ),
    ],
  );
  return _router!;
  }
}
