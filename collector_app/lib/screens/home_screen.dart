import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/billing_service.dart';
import '../services/customer_service.dart';

import '../theme/app_icons.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'daily_summary_screen.dart';
import 'notifications_screen.dart';
import '../widgets/pop_in_bounce.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final BillingService _billingService = BillingService();
  final CustomerService _customerService = CustomerService();

  bool _isLoading = true;
  int _overdueCount = 0;
  int _unpaidCount = 0;
  int _paidTodayCount = 0;
  int _totalCustomers = 0;
  double _totalCollected = 0;
  
  Map<String, double> _weeklyCollected = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDashboard());
  }

  Future<void> _loadDashboard() async {
    if (!mounted) return;
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
      double collected = 0;
      final Map<String, double> weeklySums = {};
      final now = DateTime.now();
      for (int i = 6; i >= 0; i--) {
        final d = now.subtract(Duration(days: i));
        weeklySums[DateFormat('yyyy-MM-dd').format(d)] = 0.0;
      }

      for (var b in billings) {
        final amt = (b.amountPaid != null && b.amountPaid! > 0) ? b.amountPaid! : (b.isPaid ? b.amount : 0);
        if (amt > 0) {
          if (b.billingMonth.startsWith(currentMonth)) {
            collected += amt;
          }
          if (b.paidDate != null && b.paidDate!.length >= 10) {
            final dateStr = b.paidDate!.substring(0, 10);
            if (weeklySums.containsKey(dateStr)) {
              weeklySums[dateStr] = weeklySums[dateStr]! + amt;
            }
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _overdueCount = counts['overdue'] ?? 0;
        _unpaidCount = counts['not_yet_paid'] ?? 0;
        _paidTodayCount = paidToday.length;
        _totalCustomers = customers.length;
        _totalCollected = collected;
        _weeklyCollected = weeklySums;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.currentProfile;



    return LayoutBuilder(
      builder: (context, constraints) {
        final bool tiny = constraints.maxHeight < 650;

        // Gradient takes ~50% of total height
        final double headerHeight = constraints.maxHeight * 0.50;

        // White card overlaps the gradient by 24px
        const double overlap = 24;
        final double cardTop = headerHeight - overlap;
        final double cardMinHeight = constraints.maxHeight - cardTop;

        // Chart fills remaining space inside card
        final double statsHeight = tiny ? 80 : 90;
        final double chartHeaderHeight = 40;
        final double cardPadding = tiny ? 44 : 56;
        // Subtract extra height added by the Overview header (~36px)
        final double overviewHeight = 36;
        double chartHeight = cardMinHeight - statsHeight - chartHeaderHeight - cardPadding - overviewHeight;
        if (chartHeight < 100) chartHeight = 100;

        return RefreshIndicator(
          color: Colors.white,
          backgroundColor: const Color(0xFF6C63FF),
          onRefresh: _loadDashboard,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: ClampingScrollPhysics()),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Stack(
                children: [
                  // ── Gradient Background (fills top portion) ──
                  Container(
                    width: double.infinity,
                    height: headerHeight,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF7B6CF6), Color(0xFF6C63FF), Color(0xFF5A54E8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // ── Top Row: Avatar + Greeting + Actions ──
                            Row(
                              children: [
                                Container(
                                  width: 46,
                                  height: 46,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 2),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: Image.network(
                                    'https://api.dicebear.com/7.x/micah/png?seed=${profile?.firstName ?? 'User'}&scale=110&translateY=5&backgroundColor=transparent',
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
                                      return Center(
                                        child: Text(
                                          profile?.initials ?? 'C',
                                          style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _getGreeting(),
                                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white.withValues(alpha: 0.8)),
                                      ),
                                      Text(
                                        'Hello, ${profile?.firstName ?? 'Collector'} 👋',
                                        style: GoogleFonts.inter(fontSize: tiny ? 17 : 19, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5),
                                      ),
                                    ],
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    if (profile != null) {
                                      Navigator.push(context, MaterialPageRoute(builder: (_) => NotificationsScreen(collector: profile)));
                                    }
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                                    child: AppIcons.icon(AppIcons.notificationSvg, size: 22, color: Colors.white),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: tiny ? 32 : 40),
                            // ── Total Collected Card (centered) ──
                            PopInBounce(
                              delay: const Duration(milliseconds: 100),
                              child: Container(
                                width: double.infinity,
                                padding: EdgeInsets.symmetric(horizontal: tiny ? 20 : 24, vertical: tiny ? 18 : 22),
                                decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    'Total Collected',
                                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.white.withValues(alpha: 0.8)),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _isLoading ? '—' : '₱${NumberFormat('#,##0.00').format(_totalCollected)}',
                                    style: GoogleFonts.inter(fontSize: tiny ? 28 : 34, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -1.5),
                                  ),
                                ],
                              ),
                            ),
                            ),
                            const SizedBox(height: 14),
                            // ── Daily Summary Button ──
                            PopInBounce(
                              delay: const Duration(milliseconds: 150),
                              child: GestureDetector(
                                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DailySummaryScreen())),
                                child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.summarize_outlined, size: 18, color: Colors.white),
                                    const SizedBox(width: 8),
                                    Text('Daily Summary', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                                  ],
                                ),
                              ),
                            ),
                            ),
                            // Space before card overlaps
                            SizedBox(height: overlap + 8),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // ── White Card (overlaps gradient) ──
                  Padding(
                    padding: EdgeInsets.only(top: cardTop),
                    child: Container(
                      width: double.infinity,
                      constraints: BoxConstraints(minHeight: cardMinHeight),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(28),
                          topRight: Radius.circular(28),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 20,
                            offset: const Offset(0, -4),
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(20, tiny ? 20 : 24, 20, tiny ? 12 : 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Overview',
                              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: const Color(0xFF1A1A1A)),
                            ),
                            const SizedBox(height: 12),
                            _buildQuickStats(tiny),
                            SizedBox(height: tiny ? 12 : 16),
                            Row(
                              children: [
                                Text(
                                  'Last 7 Days Revenue',
                                  style: GoogleFonts.inter(fontSize: tiny ? 14 : 16, fontWeight: FontWeight.w700, color: const Color(0xFF1A1A1A)),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(color: const Color(0xFF6C63FF).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                                  child: const Icon(Icons.show_chart_rounded, color: Color(0xFF6C63FF), size: 16),
                                ),
                              ],
                            ),
                            SizedBox(height: tiny ? 8 : 12),
                            SizedBox(
                              height: chartHeight,
                              child: _isLoading ? _buildShimmer() : _buildWeeklyChart(),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickStats(bool tiny) {
    final double cardHeight = tiny ? 80 : 90;
    final double gap = tiny ? 8 : 10;

    return SizedBox(
      height: cardHeight,
      child: Row(
        children: [
          Expanded(child: _buildMiniStat('Customers', _isLoading ? '—' : '$_totalCustomers', const Color(0xFF6C63FF), Icons.people_outline, 0)),
          SizedBox(width: gap),
          Expanded(child: _buildMiniStat('Paid Today', _isLoading ? '—' : '$_paidTodayCount', const Color(0xFF059669), Icons.check_circle_outline, 1)),
          SizedBox(width: gap),
          Expanded(child: _buildMiniStat('Unpaid', _isLoading ? '—' : '$_unpaidCount', const Color(0xFFD97706), Icons.schedule, 2)),
          SizedBox(width: gap),
          Expanded(child: _buildMiniStat('Overdue', _isLoading ? '—' : '$_overdueCount', const Color(0xFFDC2626), Icons.warning_amber_rounded, 3)),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color color, IconData icon, int index) {
    return PopInBounce(
      delay: Duration(milliseconds: 200 + (50 * index)),
      child: Container(
        decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  value,
                  style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: color, letterSpacing: -0.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: color.withValues(alpha: 0.7)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildWeeklyChart() {
    if (_weeklyCollected.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(16),
        ),
        width: double.infinity,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(color: Colors.grey.shade200, shape: BoxShape.circle),
              child: Icon(Icons.show_chart_rounded, color: Colors.grey.shade500, size: 28.0),
            ),
            const SizedBox(height: 16),
            Text('No Data', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: const Color(0xFF1A1A1A))),
            const SizedBox(height: 4),
            Text('No revenue collected recently.', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    final daysList = _weeklyCollected.keys.toList();
    double maxY = 10;
    for (var d in daysList) {
      if (_weeklyCollected[d]! > maxY) maxY = _weeklyCollected[d]!;
    }
    
    if (maxY == 0) {
      maxY = 10;
    } else {
      maxY = maxY * 1.5;
    }

    return PopInBounce(
      delay: const Duration(milliseconds: 300),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
        color: const Color(0xFFF0EFFF),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.fromLTRB(16, 24, 20, 16),
      child: LineChart(
        LineChartData(
          minX: 0,
          maxX: (daysList.length - 1).toDouble(),
          minY: 0,
          maxY: maxY,
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((LineBarSpot touchedSpot) {
                  final dateStr = daysList[touchedSpot.x.toInt()];
                  final shortDate = DateFormat('MMM dd').format(DateTime.parse(dateStr));
                  return LineTooltipItem(
                    '₱${NumberFormat('#,##0').format(touchedSpot.y)}\n',
                    GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    children: [
                      TextSpan(
                        text: shortDate,
                        style: GoogleFonts.inter(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w500),
                      ),
                    ],
                  );
                }).toList();
              },
            ),
            handleBuiltInTouches: true,
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: maxY > 1000 ? (maxY / 4) : 500,
            getDrawingHorizontalLine: (value) => FlLine(color: const Color(0xFF6C63FF).withValues(alpha: 0.12), strokeWidth: 1, dashArray: [4, 4]),
          ),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (double value, TitleMeta meta) {
                  if (value.toInt() < 0 || value.toInt() >= daysList.length) return const SizedBox();
                  final dateObj = DateTime.tryParse(daysList[value.toInt()]);
                  if (dateObj == null) return const SizedBox();
                  final dayName = DateFormat('E').format(dateObj);
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(dayName, style: GoogleFonts.inter(color: Colors.grey.shade600, fontSize: 11, fontWeight: FontWeight.w500)),
                  );
                },
                interval: 1,
                reservedSize: 28,
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 36,
                interval: maxY > 1000 ? (maxY / 4).roundToDouble() : 500,
                getTitlesWidget: (double value, TitleMeta meta) {
                   if (value == 0 || value > maxY * 0.9) return const SizedBox.shrink();
                   String formattedValue;
                   if (value >= 1000) {
                     formattedValue = '${(value / 1000).toStringAsFixed(value % 1000 == 0 ? 0 : 1)}k';
                   } else {
                     formattedValue = value.toInt().toString();
                   }
                   return Text(formattedValue, style: GoogleFonts.inter(color: Colors.grey.shade600, fontSize: 10, fontWeight: FontWeight.w500), textAlign: TextAlign.right);
                },
              ),
            ),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: List.generate(daysList.length, (i) => FlSpot(i.toDouble(), _weeklyCollected[daysList[i]] ?? 0.0)),
              isCurved: true,
              color: const Color(0xFF6C63FF),
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, percent, barData, index) {
                  return FlDotCirclePainter(radius: 4, color: const Color(0xFF6C63FF), strokeWidth: 2, strokeColor: Colors.white);
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [const Color(0xFF6C63FF).withValues(alpha: 0.4), const Color(0xFF6C63FF).withValues(alpha: 0.0)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildShimmer() {
    return Column(
      children: List.generate(
        3,
        (i) => Expanded(
          child: Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      ),
    );
  }
}
