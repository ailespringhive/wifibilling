import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/auth_service.dart';
import '../services/repair_ticket_service.dart';
import '../models/repair_ticket.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final RepairTicketService _ticketService = RepairTicketService();

  bool _isLoading = true;
  Map<String, int> _statusCounts = {};
  List<RepairTicket> _activeTickets = [];

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();
    final techId = auth.collectorId;

    try {
      final tickets = await _ticketService.getTickets(techId);
      final counts = <String, int>{
        'pending': 0,
        'assigned': 0,
        'in_progress': 0,
        'resolved': 0,
        'cancelled': 0,
      };
      for (final t in tickets) {
        counts[t.status] = (counts[t.status] ?? 0) + 1;
      }

      setState(() {
        _statusCounts = counts;
        _activeTickets = tickets;
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
            _buildGreeting(profile),
            const SizedBox(height: 24),
            _buildStatusCards(),
            const SizedBox(height: 24),
            Text(
              'Tickets Received (Last 7 Days)',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 16),
            _isLoading
                ? const Center(child: Padding(padding: EdgeInsets.all(40.0), child: CircularProgressIndicator()))
                : _buildTicketsChart(),
          ],
        ),
      ),
    );
  }

  // ── Greeting ──
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
        Container(
          width: 52, height: 52,
          decoration: BoxDecoration(
            gradient: AppTheme.avatarGradient(profile?.firstName ?? 'T'),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppTheme.accentBlue.withValues(alpha: 0.15),
                blurRadius: 12, offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              profile?.initials ?? 'T',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(greetingIcon, size: 14, color: AppTheme.accentAmber),
                const SizedBox(width: 6),
                Text(greeting, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted)),
              ]),
              const SizedBox(height: 4),
              Text(
                profile?.fullName ?? 'Technician',
                style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, letterSpacing: -0.5),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Status Summary Cards ──
  Widget _buildStatusCards() {
    return GridView.count(
      crossAxisCount: 2,
      childAspectRatio: 1.55,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _buildStatCard('Pending', _isLoading ? '—' : '${_statusCounts['pending'] ?? 0}', Icons.hourglass_top_rounded, AppTheme.accentAmber),
        _buildStatCard('In Progress', _isLoading ? '—' : '${_statusCounts['in_progress'] ?? 0}', Icons.engineering_rounded, AppTheme.accentBlue),
        _buildStatCard('Resolved', _isLoading ? '—' : '${_statusCounts['resolved'] ?? 0}', Icons.check_circle_outline_rounded, AppTheme.accentEmerald),
        _buildStatCard('Cancelled', _isLoading ? '—' : '${_statusCounts['cancelled'] ?? 0}', Icons.cancel_outlined, AppTheme.accentRose),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
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
          Text(value, style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.textPrimary, letterSpacing: -0.5)),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
        ],
      ),
    );
  }

  // ── Ticket Trend Chart ──
  Widget _buildTicketsChart() {
    if (_activeTickets.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        decoration: AppTheme.glassCard(),
        width: double.infinity,
        child: Column(
          children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(color: AppTheme.textMuted.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: const Icon(Icons.bar_chart_rounded, size: 28, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 16),
            Text('No Data', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            Text('No tickets received recently.', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted)),
          ],
        ),
      );
    }

    // Group active tickets by day over the last 7 days
    final now = DateTime.now();
    final List<int> dailyCounts = List.filled(7, 0);
    final List<String> dailyLabels = List.filled(7, '');

    for (int i = 0; i < 7; i++) {
       final day = now.subtract(Duration(days: 6 - i));
       final dayStart = DateTime(day.year, day.month, day.day);
       final dayEnd = dayStart.add(const Duration(days: 1));
       
       dailyLabels[i] = DateFormat('E').format(dayStart); // short day name (Mon, Tue)
       
       dailyCounts[i] = _activeTickets.where((t) {
         return t.createdAt.isAfter(dayStart) && t.createdAt.isBefore(dayEnd);
       }).length;
    }
    
    double maxY = dailyCounts.reduce((a, b) => a > b ? a : b).toDouble();
    if (maxY == 0) maxY = 5; // fallback
    else maxY = maxY * 1.5; // give some headroom

    return Container(
      width: double.infinity,
      height: 260,
      decoration: AppTheme.glassCard(radius: 16),
      padding: const EdgeInsets.fromLTRB(16, 24, 20, 16),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxY,
          barTouchData: BarTouchData(enabled: false),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (double value, TitleMeta meta) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      dailyLabels[value.toInt()],
                      style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  );
                },
                reservedSize: 28,
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 32,
                interval: maxY > 10 ? (maxY / 4).roundToDouble() : 1,
                getTitlesWidget: (double value, TitleMeta meta) {
                   if (value == 0 || value > maxY * 0.9) return const SizedBox.shrink();
                   return Text(
                     value.toInt().toString(),
                     style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w500),
                     textAlign: TextAlign.right,
                   );
                },
              ),
            ),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: maxY > 10 ? (maxY / 4) : 1,
            getDrawingHorizontalLine: (value) => FlLine(color: AppTheme.border.withValues(alpha: 0.5), strokeWidth: 1),
          ),
          borderData: FlBorderData(show: false),
          barGroups: List.generate(7, (i) {
            return BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: dailyCounts[i].toDouble(),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF818CF8), AppTheme.accentBlue],
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                  ),
                  width: 22,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: maxY,
                    color: AppTheme.accentBlue.withValues(alpha: 0.08),
                  )
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}
