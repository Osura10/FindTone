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

class AppRouter {
  static final router = GoRouter(
    initialLocation: '/',
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
}
