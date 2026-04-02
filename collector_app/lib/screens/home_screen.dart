import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/billing_service.dart';
import '../services/customer_service.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';
import 'package:intl/intl.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final BillingService _billingService = BillingService();
  final CustomerService _customerService = CustomerService();

  bool _isLoading = true;
  int _totalAssigned = 0;
  int _unpaidCount = 0;
  int _paidTodayCount = 0;
  double _totalCollected = 0;
  
  Map<String, double> _monthlyCollected = {};

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();
    final collectorId = auth.collectorId;

    try {
      final customers =
          await _customerService.getAssignedCustomers(collectorId);
      final customerIds = customers.map((c) => c.userId).toList();
      final billings =
          await _billingService.getAssignedBillings(collectorId);
      final counts = await _billingService.getStatusCounts(customerIds);

      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final paidToday = billings.where((b) {
        if (b.paidDate == null) return false;
        return b.paidDate!.startsWith(today) && b.isPaid;
      }).toList();

      final currentMonth = DateFormat('MMMM yyyy').format(DateTime.now());
      double collected = 0;
      final Map<String, double> monthlySums = {};

      for (var b in billings) {
        if (b.isPaid) {
          final amt = (b.amountPaid != null && b.amountPaid! > 0) ? b.amountPaid! : b.amount;
          if (b.billingMonth == currentMonth) collected += amt;

          final monthKey = b.billingMonth;
          if (monthKey.isNotEmpty) {
            monthlySums[monthKey] = (monthlySums[monthKey] ?? 0) + amt;
          }
        }
      }

      setState(() {
        _totalAssigned = customers.length;
        _unpaidCount = counts['not_yet_paid'] ?? 0;
        _paidTodayCount = paidToday.length;
        _totalCollected = collected;
        _monthlyCollected = monthlySums;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.currentProfile;

    return RefreshIndicator(
      color: AppTheme.accentBlue,
      backgroundColor: AppTheme.bgCard,
      onRefresh: _loadDashboard,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Greeting ──
            _buildGreeting(profile),
            const SizedBox(height: 24),

            // ── Stats Cards ──
            _buildStatsGrid(),
            const SizedBox(height: 28),

            // ── Monthly Collections Chart ──
            Row(
              children: [
                Text(
                  'Monthly Progress',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.bar_chart_rounded, color: AppTheme.accentPurple, size: 20),
              ],
            ),
            const SizedBox(height: 16),
            _isLoading ? _buildShimmer() : _buildMonthlyChart(),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthlyChart() {
    if (_monthlyCollected.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(40),
        decoration: AppTheme.glassCard(radius: 16),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.accentPurple.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.show_chart_rounded, size: 28, color: AppTheme.accentPurple),
            ),
            const SizedBox(height: 16),
            Text('No collection data', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            Text('Completed collections will appear here as a chart.', textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted)),
          ],
        ),
      );
    }

    // Sort by recent months. Note: Month format like "April 2026".
    var monthsList = _monthlyCollected.keys.toList();
    monthsList.sort((a, b) {
      // Basic fallback sort, parsing "MMMM yyyy" if possible
      try {
        final dA = DateFormat('MMMM yyyy').parse(a);
        final dB = DateFormat('MMMM yyyy').parse(b);
        return dA.compareTo(dB);
      } catch (_) {
        return a.compareTo(b);
      }
    });

    final recentMonths = monthsList.reversed.take(6).toList().reversed.toList();

    double maxAmount = 10;
    for (var m in recentMonths) {
      if (_monthlyCollected[m]! > maxAmount) maxAmount = _monthlyCollected[m]!;
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
      decoration: AppTheme.glassCard(radius: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '₱${NumberFormat('#,##0').format(recentMonths.map((e)=>_monthlyCollected[e]!).fold(0.0,(a,b)=>a+b))}',
            style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, letterSpacing: -1),
          ),
          Text('Collected across last ${recentMonths.length} months', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary)),
          const SizedBox(height: 32),
          
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: recentMonths.map((month) {
              final amount = _monthlyCollected[month]!;
              final heightRatio = amount / maxAmount;
              
              String shortName = month;
              if (month.contains(' ')) shortName = month.split(' ')[0].substring(0, 3);
              
              return Tooltip(
                message: '$month: ₱${NumberFormat('#,##0').format(amount)}',
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      height: 120 * heightRatio + 8, // base height 8 for 0
                      width: 28,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF38BDF8), Color(0xFF818CF8)],
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                        ),
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          )
                        ]
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(shortName, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildGreeting(UserProfile? profile) {
    final hour = DateTime.now().hour;
    String greeting;
    IconData greetingIcon;
    if (hour < 12) {
      greeting = 'Good Morning';
      greetingIcon = Icons.wb_sunny_outlined;
    } else if (hour < 17) {
      greeting = 'Good Afternoon';
      greetingIcon = Icons.wb_sunny_outlined;
    } else {
      greeting = 'Good Evening';
      greetingIcon = Icons.nights_stay_outlined;
    }

    return Row(
      children: [
        // Circular avatar
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            gradient: AppTheme.avatarGradient(profile?.firstName ?? 'C'),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppTheme.accentBlue.withValues(alpha: 0.15),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              profile?.initials ?? 'C',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(greetingIcon, size: 14, color: AppTheme.accentAmber),
                  const SizedBox(width: 6),
                  Text(
                    greeting,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                profile?.fullName ?? 'Collector',
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      childAspectRatio: 1.45,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _buildStatCard(
          'Assigned',
          _isLoading ? '—' : '$_totalAssigned',
          Icons.people_alt_outlined,
          AppTheme.accentBlue,
        ),
        _buildStatCard(
          'Unpaid',
          _isLoading ? '—' : '$_unpaidCount',
          Icons.pending_actions_outlined,
          AppTheme.accentAmber,
        ),
        _buildStatCard(
          'Paid Today',
          _isLoading ? '—' : '$_paidTodayCount',
          Icons.check_circle_outline,
          AppTheme.accentEmerald,
        ),
        _buildStatCard(
          'Collected',
          _isLoading ? '—' : '₱${NumberFormat('#,##0').format(_totalCollected)}',
          Icons.account_balance_wallet_outlined,
          AppTheme.accentPurple,
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color color) {
    return Container(
      decoration: AppTheme.statCard(color),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const Spacer(),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: AppTheme.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildShimmer() {
    return Column(
      children: List.generate(
        3,
        (i) => Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 10),
          height: 72,
          decoration: AppTheme.glassCard(radius: 14),
        ),
      ),
    );
  }
}
