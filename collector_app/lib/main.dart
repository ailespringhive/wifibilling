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
      bottomNavigationBar: LayoutBuilder(
        builder: (context, constraints) {
          final totalWidth = constraints.maxWidth;
          final itemWidth = totalWidth / 5;
          const bubbleWidth = 64.0;
          final leftPos = (itemWidth * _currentIndex) + (itemWidth - bubbleWidth) / 2;
          final bottomPadding = MediaQuery.of(context).padding.bottom;

          return Container(
            height: 70 + bottomPadding,
            color: AppTheme.bgDark, // matches body background so gap looks transparent
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                // 1. The White Bar Background
                Positioned(
                  left: 0, right: 0, bottom: 0,
                  height: 70 + bottomPadding,
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      border: const Border(top: BorderSide(color: AppTheme.border, width: 1)),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))
                      ],
                    ),
                  ),
                ),
                
                // 2. The Sliding Magic Indicator Bubble
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOutBack,
                  bottom: 30 + bottomPadding, // Lowered slightly so it cuts into the bar deeper
                  left: leftPos,
                  child: Container(
                    width: bubbleWidth,
                    height: bubbleWidth,
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard, // WHITE! Same as the nav bar
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppTheme.bgDark, // LIGHT GREY body background to create the U-shaped cutout illusion!
                        width: 8, // Thicker gap
                      ),
                    ),
                  ),
                ),

                // 3. The Interactive Icons Row
                Positioned(
                  left: 0, right: 0, bottom: 0,
                  height: 70 + bottomPadding,
                  child: SafeArea(
                    bottom: true,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildNavItem(0, AppIcons.homeSvg),
                        _buildNavItem(1, AppIcons.customerSvg),
                        _buildNavItem(2, AppIcons.billSvg),
                        _buildNavItem(3, AppIcons.receiptSvg),
                        _buildNavItem(4, AppIcons.profileSvg),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }


  Widget _buildNavItem(int index, String svgStr) {
    final isActive = _currentIndex == index;
    // The inactive icons sit in the White nav bar, so they are grey.
    // The active icon sits in the White bubble, so it becomes blue!
    final color = isActive ? Colors.white : Colors.grey.shade400;
    
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _currentIndex = index),
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          height: 70,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutBack,
            transform: Matrix4.identity()..translate(0.0, isActive ? -30.0 : 0.0), // Slides up directly into the U-shaped cutout!
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  padding: EdgeInsets.all(isActive ? 8 : 0),
                  decoration: BoxDecoration(
                    color: isActive ? AppTheme.accentBlue : Colors.transparent, // Solid blue background when active
                    shape: BoxShape.circle,
                    boxShadow: isActive
                        ? [BoxShadow(color: AppTheme.accentBlue.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 4))]
                        : [],
                  ),
                  child: AppIcons.icon(svgStr, color: color, size: 24),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
