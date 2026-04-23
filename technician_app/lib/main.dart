import 'dart:async';
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
import 'screens/tickets_screen.dart';
import 'screens/customer_detail_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/add_customer_screen.dart';
import 'services/notification_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:appwrite/appwrite.dart';
import 'package:hugeicons/hugeicons.dart';

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

  runZonedGuarded(() {
    runApp(const TechnicianApp());
  }, (error, stack) {
    debugPrint('Uncaught app error: $error');
  }, zoneSpecification: ZoneSpecification(
    print: (self, parent, zone, line) {
      if (line.contains('Appwrite is using localStorage for session management')) return;
      parent.print(zone, line);
    },
  ));
}

class TechnicianApp extends StatelessWidget {
  const TechnicianApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthService(),
      child: MaterialApp(
        title: 'WiFi Technician',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AuthGate(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const MainShell(),
          '/customer-detail': (context) => const CustomerDetailScreen(),
          '/profile': (context) => const ProfileScreen(),
        },
      ),
    );
  }
}

/// Checks if user is already logged in
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
    if (mounted) {
      // Small delay ensures first build of pulse animation is settled 
      // before we swap subtrees
      Future.microtask(() {
        if (mounted) setState(() => _checking = false);
      });
    }
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
                          color: AppTheme.accentBlue.withValues(alpha: 
                            0.2 + (_pulseController.value * 0.15),
                          ),
                          blurRadius: 24 + (_pulseController.value * 12),
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: HugeIcon(
                      icon: HugeIcons.strokeRoundedWifi01,
                      size: 36.0,
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
    
    // Use Consumer to isolate the logged-in state check
    return Consumer<AuthService>(
      builder: (context, auth, _) {
        return auth.isLoggedIn ? const MainShell() : const LoginScreen();
      },
    );
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
  RealtimeSubscription? _subscription;

  Timer? _pollingTimer;
  bool _isInitialLoad = true;

  @override
  void initState() {
    super.initState();
    _loadUnreadCount();
    _subscribeToNotifications();
    
    // Fallback polling for flutter web websocket issues: check every 2s
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (_) => _loadUnreadCount());
  }

  void _subscribeToNotifications() {
     final realtime = AppwriteService().realtime;
     // Subscribe to real-time events for mobile notifications collection
     _subscription = realtime.subscribe(['databases.$appwriteDatabaseId.collections.${AppCollections.mobileNotifications}.rows']);
     _subscription?.stream.listen((response) {
       final payload = response.payload;
       if (payload.isNotEmpty) {
         final auth = context.read<AuthService>();
         if (payload['technicianId'] == auth.collectorId && payload['isRead'] == false) {
             if (mounted) {
                // If it's a new unread payload, immediately increment and popup
                setState(() => _unreadCount++);
                _showNotificationToast(payload['title'] ?? 'New Alert', payload['message'] ?? '');
             }
         }
       }
     });
  }

  void _showNotificationToast(String title, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppTheme.bgCard,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
           borderRadius: BorderRadius.circular(12),
           side: const BorderSide(color: AppTheme.accentBlue, width: 1.5),
        ),
        content: Row(
           children: [
              AppIcons.icon(AppIcons.notificationSvg, color: AppTheme.accentBlue, size: 24.0),
              const SizedBox(width: 12),
              Expanded(
                 child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                       Text(title, style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                       Text(message, style: GoogleFonts.inter(color: Colors.grey[400], fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                 )
              )
           ]
        ),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
           label: 'VIEW',
           textColor: AppTheme.accentBlue,
           onPressed: () {
              // Hide snackbar immediately
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
              Navigator.of(context).push(
                  MaterialPageRoute(
                     builder: (ctx) => NotificationsScreen(collector: context.read<AuthService>().currentProfile!),
                  ),
              ).then((_) => _loadUnreadCount());
           }
        ),
      )
    );
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _subscription?.close();
    super.dispose();
  }

  Future<void> _loadUnreadCount() async {
    try {
      if (!mounted) return;
      final auth = context.read<AuthService>();
      final count = await _notificationService.getUnreadCount(auth.collectorId);
      if (mounted) {
         WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            if (!_isInitialLoad) {
               if (count > _unreadCount) {
                  _showNotificationToast('New Alert', 'You have new unread notifications');
               }
            } else {
               _isInitialLoad = false;
            }
            setState(() => _unreadCount = count);
         });
      }
    } catch (_) {}
  }

  final _screens = const [
    HomeScreen(),
    CustomersScreen(),
    TicketsScreen(),
    ProfileScreen(),
  ];



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: _currentIndex == 3 ? null : AppBar(
        automaticallyImplyLeading: false,
        title: Builder(
          builder: (context) {
            final auth = context.watch<AuthService>();
            final profile = auth.currentProfile;
            if (profile == null) return const SizedBox.shrink();
            
            return Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9), // Slate 100
                shape: BoxShape.circle,
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.network(
                'https://api.dicebear.com/7.x/micah/png?seed=${profile.firstName}&scale=110&translateY=5&backgroundColor=transparent',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Center(
                    child: Text(
                      profile.initials, 
                      style: GoogleFonts.inter(color: const Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold)
                    ),
                  );
                },
              ),
            );
          }
        ),
        toolbarHeight: 64,
        actions: [
          Builder(
            builder: (context) {
              final auth = context.watch<AuthService>();
              final profile = auth.currentProfile;
              if (profile == null) return const SizedBox.shrink();

              return Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Notification bell constrained inside 12px container
                    Stack(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.grey.shade200, width: 1.5),
                          ),
                          child: Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (ctx) => NotificationsScreen(collector: profile),
                                  ),
                                );
                                _loadUnreadCount();
                              },
                              child: Center(
                                child: AppIcons.icon(
                                  AppIcons.notificationSvg,
                                  size: 20,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                        if (_unreadCount > 0)
                          Positioned(
                            right: 6,
                            top: 6,
                            child: Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: AppTheme.accentRose,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                              ),
                            ),
                          ),
                      ],
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
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: AppTheme.border.withValues(alpha: 0.5), width: 1),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildNavItem(0, AppIcons.homeSvg),
                _buildNavItem(1, AppIcons.customerSvg),
                
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const AddCustomerScreen()),
                      );
                    },
                    behavior: HitTestBehavior.opaque,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: AppIcons.icon(
                        AppIcons.addCustomerSvg,
                        color: const Color(0xFF27272A),
                        size: 40,
                      ),
                    ),
                  ),
                ),

                _buildNavItem(2, AppIcons.ticketSvg),
                _buildNavItem(3, AppIcons.profileSvg),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, String svgStr) {
    final isActive = _currentIndex == index;
    final color = isActive ? const Color(0xFF5B9E99) : const Color(0xFFB0B8C1);
    
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _currentIndex = index),
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: AppIcons.icon(svgStr, color: color, size: 26),
        ),
      ),
    );
  }
}
