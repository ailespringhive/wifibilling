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
import '../theme/app_icons.dart';
import '../widgets/pop_in_bounce.dart';
import 'package:hugeicons/hugeicons.dart';

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
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.currentProfile;


    
    // Prevent rendering fake data immediately on page load to prevent glitch
    if (profile == null) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.accentBlue),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final screenH = constraints.maxHeight;
        final bool tiny = screenH < 700;
        final double gap = tiny ? 10 : 12;
        final double rowHeight = tiny ? 100 : 115;
        
        // Dynamically calculate exact remaining space to avoid scrolling
        final double spaceUsed = (rowHeight * 3) + (gap * 2) + 200; // heights of cards + padding + greeting + text
        double chartHeight = screenH - spaceUsed;
        if (chartHeight < 160) chartHeight = 160;

        return RefreshIndicator(
          color: const Color(0xFF1A1A1A),
          backgroundColor: Colors.white,
          onRefresh: _loadDashboard,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: ClampingScrollPhysics()),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight,
              ),
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 8, 20, tiny ? 12 : 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    PopInBounce(
                      delay: const Duration(milliseconds: 100),
                      child: _buildGreeting(profile),
                    ),
                    SizedBox(height: tiny ? 16 : 24),

                    // ── Responsive Stats Grid ──
                    _buildStatusCards(gap: gap, rowHeight: rowHeight, tiny: tiny),
                    SizedBox(height: tiny ? 12 : 24),

                    // ── Tickets Trend Chart Header ──
                    PopInBounce(
                      delay: const Duration(milliseconds: 500),
                      child: Text(
                        'Tickets Received (Last 7 Days)',
                        style: GoogleFonts.inter(
                          fontSize: tiny ? 14 : 16,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF1A1A1A),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // ── Responsive Chart ──
                    PopInBounce(
                      delay: const Duration(milliseconds: 600),
                      child: SizedBox(
                        height: chartHeight,
                        child: _isLoading
                            ? const Center(child: Padding(padding: EdgeInsets.all(40.0), child: CircularProgressIndicator()))
                            : _buildTicketsChart(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildGreeting(UserProfile profile) {
    final hour = DateTime.now().hour;
    String greetingText = hour < 12 ? 'Good Morning' : (hour < 17 ? 'Good Afternoon' : 'Good Evening');
    List<List<dynamic>> weatherIcon = hour < 17 ? HugeIcons.strokeRoundedSun01 : HugeIcons.strokeRoundedMoon01;
    Color weatherColor = hour < 17 ? const Color(0xFFF59E0B) : const Color(0xFF6366F1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hello ${profile.firstName} 👋',
          style: GoogleFonts.inter(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF1A1A1A),
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            HugeIcon(icon: weatherIcon, size: 14.0, color: weatherColor),
            const SizedBox(width: 6),
            Text(greetingText, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted, fontWeight: FontWeight.w500)),
          ]
        ),
      ],
    );
  }

  Widget _buildStatusCards({required double gap, required double rowHeight, required bool tiny}) {
    final int totalTickets = _activeTickets.length;

    return Column(
      children: [
        // Top Banner Card: Total Active Tickets
        PopInBounce(
          delay: const Duration(milliseconds: 200),
          child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFFEEF5F4), // Desaturated Pale Teal/Cyan
            borderRadius: BorderRadius.circular(tiny ? 16 : 20),
          ),
          padding: EdgeInsets.symmetric(horizontal: tiny ? 16 : 20, vertical: tiny ? 16 : 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Active Tickets', 
                      style: GoogleFonts.inter(fontSize: tiny ? 12 : 14, color: const Color(0xFF4B5563), fontWeight: FontWeight.w600)
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.end,
                      spacing: 10,
                      runSpacing: 4,
                      children: [
                        Text(
                          _isLoading ? '—' : '$totalTickets', 
                          style: GoogleFonts.inter(fontSize: tiny ? 28 : 34, fontWeight: FontWeight.w800, color: const Color(0xFF1A1A1A), height: 1.1, letterSpacing: -1)
                        ),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              HugeIcon(icon: HugeIcons.strokeRoundedAnalyticsUp, color: const Color(0xFF5B9E99), size: 14.0),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  'Active assignments', 
                                  style: GoogleFonts.inter(fontSize: tiny ? 11 : 12, color: const Color(0xFF5B9E99), fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ]
                    )
                  ]
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF5B9E99).withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: AppIcons.icon(AppIcons.ticketSvg, color: const Color(0xFF5B9E99), size: 28),
              )
            ]
          )
        )),
        SizedBox(height: gap),
        // Row 2: Pending & In Progress
        PopInBounce(
          delay: const Duration(milliseconds: 300),
          child: SizedBox(
            height: rowHeight,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _buildStatCard(
                label: 'Pending', 
                value: _isLoading ? '—' : '${_statusCounts['pending'] ?? 0}', 
                icon: HugeIcons.strokeRoundedHourglass, 
                iconColor: const Color(0xFFD3A28F), // Muted Earthy Orange
                bgColor: const Color(0xFFFDF2ED), // Desaturated Pale Beige 
              )),
              SizedBox(width: gap),
              Expanded(child: _buildStatCard(
                label: 'In Progress', 
                value: _isLoading ? '—' : '${_statusCounts['in_progress'] ?? 0}', 
                icon: HugeIcons.strokeRoundedRepair, 
                iconColor: const Color(0xFF738FA7), // Muted Denim
                bgColor: const Color(0xFFEEF2F6), // Desaturated Pale Grey/Blue
              )),
            ],
          )
        )),
        SizedBox(height: gap),
        // Row 3: Resolved & Cancelled
        PopInBounce(
          delay: const Duration(milliseconds: 400),
          child: SizedBox(
            height: rowHeight,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _buildStatCard(
                label: 'Resolved', 
                value: _isLoading ? '—' : '${_statusCounts['resolved'] ?? 0}', 
                icon: HugeIcons.strokeRoundedCheckmarkCircle02, 
                iconColor: const Color(0xFF8F88B6), // Muted Slate Purple
                bgColor: const Color(0xFFF3EFFF), // Desaturated Periwinkle
              )),
              SizedBox(width: gap),
              Expanded(child: _buildStatCard(
                label: 'Cancelled', 
                value: _isLoading ? '—' : '${_statusCounts['cancelled'] ?? 0}', 
                icon: HugeIcons.strokeRoundedCancelCircle, 
                iconColor: const Color(0xFFC4868A), // Muted Dusty Rose
                bgColor: const Color(0xFFFCEEED), // Desaturated Pale Ash Red
              )),
            ],
          )
        )),
      ],
    );
  }

  Widget _buildStatCard({
    required String label, 
    required String value, 
    required List<List<dynamic>> icon, 
    required Color iconColor,
    required Color bgColor,
    String? percentageText,
  }) {
    final screenH = MediaQuery.of(context).size.height;
    final bool tiny = screenH < 700;
    final double cardPadH = tiny ? 12 : 16;
    final double cardPadV = tiny ? 10 : 14;
    final double valueFontSize = tiny ? 22 : 26;
    final double labelFontSize = tiny ? 11 : 13;
    final double borderRadius = tiny ? 16 : 20;

    final textColor = const Color(0xFF1A1A1A);
    final labelColor = const Color(0xFF4B5563); // Gray 600

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      padding: EdgeInsets.symmetric(horizontal: cardPadH, vertical: cardPadV),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: labelFontSize,
                    color: labelColor,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              HugeIcon(icon: icon, color: iconColor.withValues(alpha: 0.5), size: labelFontSize + 4),
            ],
          ),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: valueFontSize,
                  fontWeight: FontWeight.w800,
                  color: textColor,
                  letterSpacing: -1,
                ),
              ),
            ),
          ),
          const SizedBox(height: 2),
          if (percentageText != null)
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                HugeIcon(icon: HugeIcons.strokeRoundedAnalyticsUp, color: iconColor, size: 13.0),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    percentageText,
                    style: GoogleFonts.inter(
                      fontSize: tiny ? 9 : 11,
                      color: iconColor,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            )
          else
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(3),
                      margin: const EdgeInsets.only(right: 6),
                      decoration: BoxDecoration(
                        color: iconColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: HugeIcon(icon: icon, color: iconColor, size: 11.0),
                    ),
                    Text(
                      'Tickets',
                      style: GoogleFonts.inter(fontSize: 10, color: labelColor.withValues(alpha: 0.7), fontWeight: FontWeight.w500),
                    ),
                  ],
              ),
            ),
        ],
      ),
    );
  }

  // ── Ticket Trend Chart ──
  Widget _buildTicketsChart() {
    if (_activeTickets.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFEEF5F4),
          borderRadius: BorderRadius.circular(16),
        ),
        width: double.infinity,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(color: AppTheme.textMuted.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: HugeIcon(icon: HugeIcons.strokeRoundedChartBarIncreasing, color: AppTheme.textMuted, size: 24.0),
            ),
            const SizedBox(height: 12),
            Text('No Data', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            Text('No tickets received recently.', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted), textAlign: TextAlign.center),
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
    if (maxY == 0) {
      maxY = 5; // fallback
    } else {
      maxY = maxY * 1.5; // give some headroom
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFEEF5F4), // Matching 'Total Active Tickets' banner
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.fromLTRB(16, 24, 20, 16),
      child: LineChart(
        LineChartData(
          minX: 0,
          maxX: 6,
          minY: 0,
          maxY: maxY,
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((LineBarSpot touchedSpot) {
                  return LineTooltipItem(
                    '${touchedSpot.y.toInt()}',
                    GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    children: [
                      TextSpan(
                        text: '\nTickets',
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
            horizontalInterval: maxY > 10 ? (maxY / 4) : 1,
            getDrawingHorizontalLine: (value) => FlLine(color: AppTheme.border.withValues(alpha: 0.5), strokeWidth: 1, dashArray: [4, 4]),
          ),
          borderData: FlBorderData(show: false),
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
                      style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                  );
                },
                interval: 1,
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
          lineBarsData: [
            LineChartBarData(
              spots: List.generate(7, (i) => FlSpot(i.toDouble(), dailyCounts[i].toDouble())),
              isCurved: true,
              color: const Color(0xFF8B5CF6),
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, percent, barData, index) {
                  return FlDotCirclePainter(
                    radius: 4,
                    color: const Color(0xFF8B5CF6),
                    strokeWidth: 2,
                    strokeColor: Colors.white,
                  );
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF8B5CF6).withValues(alpha: 0.4),
                    const Color(0xFF8B5CF6).withValues(alpha: 0.0)
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
