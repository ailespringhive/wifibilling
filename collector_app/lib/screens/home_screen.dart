import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/billing_service.dart';
import '../services/customer_service.dart';
import '../models/billing.dart';
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
  List<Billing> _recentBillings = [];

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

      final currentMonth = DateFormat('yyyy-MM').format(DateTime.now());
      final collected = billings
          .where((b) =>
              b.isPaid &&
              b.billingMonth == currentMonth)
          .fold<double>(0, (sum, b) => sum + b.amount);

      setState(() {
        _totalAssigned = customers.length;
        _unpaidCount = counts['not_yet_paid'] ?? 0;
        _paidTodayCount = paidToday.length;
        _totalCollected = collected;
        _recentBillings =
            billings.where((b) => !b.isPaid).take(5).toList();
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

            // ── Pending Collections ──
            Row(
              children: [
                Text(
                  'Pending Collections',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const Spacer(),
                if (_recentBillings.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.accentAmber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_recentBillings.length} pending',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.accentAmber,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            _isLoading
                ? _buildShimmer()
                : _recentBillings.isEmpty
                    ? _buildEmptyPending()
                    : Column(
                        children: _recentBillings
                            .map((b) => _buildPendingCard(b))
                            .toList(),
                      ),
          ],
        ),
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

  Widget _buildPendingCard(Billing billing) {
    final statusColor = AppTheme.statusColor(billing.paymentStatus);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: AppTheme.glassCard(radius: 14),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '₱',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: statusColor,
              ),
            ),
          ),
        ),
        title: Text(
          billing.customerName ?? billing.customerId.substring(0, 12),
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        subtitle: Text(
          '${billing.billingMonth} · ₱${NumberFormat('#,##0').format(billing.amount)}',
          style: GoogleFonts.inter(
            fontSize: 12,
            color: AppTheme.textMuted,
          ),
        ),
        trailing: AppTheme.statusBadge(billing.paymentStatus, billing.statusLabel),
      ),
    );
  }

  Widget _buildEmptyPending() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: AppTheme.glassCard(),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.accentEmerald.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_outline_rounded,
                size: 28, color: AppTheme.accentEmerald),
          ),
          const SizedBox(height: 16),
          Text(
            'All caught up!',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'No pending collections right now.',
            style: GoogleFonts.inter(
              fontSize: 13,
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
          margin: const EdgeInsets.only(bottom: 10),
          height: 72,
          decoration: AppTheme.glassCard(radius: 14),
        ),
      ),
    );
  }
}
