import 'package:go_router/go_router.dart';
import '../../features/splash/screens/splash_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/buyer/screens/buyer_home_screen.dart';
import '../../features/shop/screens/shop_home_screen.dart';
import '../../features/marketplace/screens/listing_details_screen.dart';

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
    ],
  );
}
