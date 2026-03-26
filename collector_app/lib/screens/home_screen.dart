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
      // Get assigned customers
      final customers =
          await _customerService.getAssignedCustomers(collectorId);
      final customerIds = customers.map((c) => c.userId).toList();

      // Get billings
      final billings =
          await _billingService.getAssignedBillings(collectorId);

      // Get status counts
      final counts = await _billingService.getStatusCounts(customerIds);

      // Paid today
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final paidToday = billings.where((b) {
        if (b.paidDate == null) return false;
        return b.paidDate!.startsWith(today) && b.isPaid;
      }).toList();

      // Total collected this month
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
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Stats Cards ──
            _buildStatsGrid(),
            const SizedBox(height: 28),

            // ── Pending Collections ──
            Text(
              'Pending Collections',
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
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
    if (hour < 12) {
      greeting = 'Good Morning';
    } else if (hour < 17) {
      greeting = 'Good Afternoon';
    } else {
      greeting = 'Good Evening';
    }

    return Row(
      children: [
        // Avatar
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            gradient: AppTheme.avatarGradient(profile?.firstName ?? 'C'),
            borderRadius: BorderRadius.circular(14),
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
              Text(
                '$greeting 👋',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppTheme.textMuted,
                ),
              ),
              const SizedBox(height: 2),
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
      childAspectRatio: 1.5,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _buildStatCard(
          'Assigned',
          _isLoading ? '—' : '$_totalAssigned',
          Icons.people_alt_rounded,
          AppTheme.accentBlue,
        ),
        _buildStatCard(
          'Unpaid',
          _isLoading ? '—' : '$_unpaidCount',
          Icons.pending_actions_rounded,
          AppTheme.accentAmber,
        ),
        _buildStatCard(
          'Paid Today',
          _isLoading ? '—' : '$_paidTodayCount',
          Icons.check_circle_rounded,
          AppTheme.accentEmerald,
        ),
        _buildStatCard(
          'Collected',
          _isLoading ? '—' : '₱${NumberFormat('#,##0').format(_totalCollected)}',
          Icons.account_balance_wallet_rounded,
          AppTheme.accentPurple,
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
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
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
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
        trailing: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(2),
            border: Border.all(color: statusColor.withValues(alpha: 0.15)),
          ),
          child: Text(
            billing.statusLabel,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: statusColor,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyPending() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle_outline_rounded,
              size: 48, color: AppTheme.accentEmerald),
          const SizedBox(height: 12),
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
        (_) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 72,
          decoration: BoxDecoration(
            color: AppTheme.bgCard,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
        ),
      ),
    );
  }
}
