import 'package:flutter/material.dart';

import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'config/appwrite_config.dart';
import 'services/auth_service.dart';
import 'services/local_cache_service.dart';
import 'theme/app_theme.dart';
import 'theme/app_icons.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/customers_screen.dart';
import 'screens/bills_screen.dart';
import 'screens/collection_history_screen.dart';
import 'screens/customer_detail_screen.dart';
import 'screens/receipt_preview_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/notifications_screen.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize Appwrite
  AppwriteService().init();

  // Initialize Local Cache
  await LocalCacheService().init();

  // Set status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: AppTheme.bgCard,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const CollectorApp());
}

class CollectorApp extends StatelessWidget {
  const CollectorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthService(),
      child: MaterialApp(
        title: 'WiFi Collector',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthGate(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const MainShell(),
          '/customer-detail': (context) => const CustomerDetailScreen(),
          '/receipt-preview': (context) => const ReceiptPreviewScreen(),
          '/profile': (context) => const ProfileScreen(),
        },
      ),
    );
  }
}

/// Checks if user is already logged in and reactively switches screens
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> with SingleTickerProviderStateMixin {
  bool _checking = true;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _checkAuth();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _checkAuth() async {
    final auth = context.read<AuthService>();
    await auth.checkSession();
    if (mounted) setState(() => _checking = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return Scaffold(
        backgroundColor: AppTheme.bgDark,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  return Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accentBlue.withValues(
                            alpha: 0.2 + (_pulseController.value * 0.15),
                          ),
                          blurRadius: 24 + (_pulseController.value * 12),
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.wifi_outlined,
                      size: 36,
                      color: AppTheme.textPrimary,
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppTheme.accentBlue.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Reactive: context.watch rebuilds whenever AuthService notifies.
    // No Navigator calls — screens are swapped structurally in the tree.
    final isLoggedIn = context.watch<AuthService>().isLoggedIn;
    return isLoggedIn ? const MainShell() : const LoginScreen();
  }
}


/// Main shell with premium bottom navigation
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  int _unreadCount = 0;
  final NotificationService _notificationService = NotificationService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadUnreadCount());
  }

  Future<void> _loadUnreadCount() async {
    try {
      final auth = context.read<AuthService>();
      final count = await _notificationService.getUnreadCount(auth.collectorId);
      if (mounted) setState(() => _unreadCount = count);
    } catch (_) {}
  }

  final _screens = const [
    HomeScreen(),
    CustomersScreen(),
    BillsScreen(),
    CollectionHistoryScreen(),
    ProfileScreen(),
  ];

  final _titles = const [
    'Dashboard',
    'Customers',
    'Bills',
    'History',
    'Profile',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: (_currentIndex == 0 || _currentIndex == 4) ? null : AppBar(
        automaticallyImplyLeading: false,
        title: Text(_titles[_currentIndex]),
        toolbarHeight: 64,
        actions: [
          Builder(
            builder: (context) {
              final auth = context.watch<AuthService>();
              final profile = auth.currentProfile;

              return Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          IconButton(
                            onPressed: () async {
                              if (profile != null) {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (ctx) => NotificationsScreen(collector: profile),
                                  ),
                                );
                                _loadUnreadCount();
                              }
                            },
                            icon: AppIcons.icon(AppIcons.notificationSvg, color: AppTheme.textPrimary, size: 24),
                            tooltip: 'Notifications',
                          ),
                          if (_unreadCount > 0)
                            Positioned(
                              right: 10,
                              top: 10,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppTheme.accentRose,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),

                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: _screens[_currentIndex],
      ),
      bottomNavigationBar: Container(
        height: 70 + MediaQuery.of(context).padding.bottom,
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Dynamic sliding magic indicator bubble
            AnimatedPositioned(
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeOutBack,
              top: -15, // Pops up over the edge
              left: (MediaQuery.of(context).size.width / 5) * _currentIndex + ((MediaQuery.of(context).size.width / 5) - 56) / 2,
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272A),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 4),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF27272A).withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
              ),
            ),
            
            // The row of icons over the sliding indicator
            Row(
              children: [
                _buildNavItem(0, AppIcons.homeSvg),
                _buildNavItem(1, AppIcons.customerSvg),
                _buildNavItem(2, AppIcons.billSvg, size: 28),
                _buildNavItem(3, AppIcons.receiptSvg),
                _buildNavItem(4, AppIcons.profileSvg),
              ],
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildNavItem(int index, String svgStr, {double size = 26}) {
    final isActive = _currentIndex == index;
    final color = isActive ? Colors.white : Colors.grey.shade400;
    
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _currentIndex = index),
        behavior: HitTestBehavior.opaque,
        child: Container(
          height: 70,
          color: Colors.transparent,
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              // Icon translates up when active
              AnimatedPositioned(
                duration: const Duration(milliseconds: 350),
                curve: Curves.easeOutBack,
                top: isActive ? 2 : 22, 
                child: AppIcons.icon(svgStr, color: color, size: size),
              ),
              // Label slides up when active
              AnimatedPositioned(
                duration: const Duration(milliseconds: 350),
                curve: Curves.easeOutBack,
                bottom: isActive ? 10 : -20,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 200),
                  opacity: isActive ? 1.0 : 0.0,
                  child: Text(
                    _titles[index],
                    style: const TextStyle(
                      color: Color(0xFF27272A),
                      fontWeight: FontWeight.w700,
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
