import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:convert';

import '../services/billing_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/pop_in_bounce.dart';

class DailySummaryScreen extends StatefulWidget {
  const DailySummaryScreen({super.key});

  @override
  State<DailySummaryScreen> createState() => _DailySummaryScreenState();
}

class _DailySummaryScreenState extends State<DailySummaryScreen> {
  bool _isLoading = true;
  double _totalCollected = 0.0;
  int _customersVisited = 0;
  List<Map<String, dynamic>> _todayPayments = [];
  
  @override
  void initState() {
    super.initState();
    _loadDailyStats();
  }

  Future<void> _loadDailyStats() async {
    setState(() => _isLoading = true);
    try {
      final auth = context.read<AuthService>();
      // We don't have a direct query for 'today's payments' because payments are stored in notes JSON.
      // So we fetch all billings that have some payment recorded (amountPaid > 0)
      final allBillings = await BillingService().getAssignedBillings(auth.collectorId);
      
      final now = DateTime.now();
      final todayStr = DateFormat('yyyy-MM-dd').format(now);
      
      double total = 0.0;
      List<Map<String, dynamic>> payments = [];
      Set<String> visitedCustomers = {};
      
      for (final billing in allBillings) {
        if (billing.notes.isEmpty) continue;
        
        try {
          final decoded = jsonDecode(billing.notes);
          if (decoded is List) {
            for (final entry in decoded) {
              final dateStr = entry['date'] as String?;
              if (dateStr == null) continue;
              
              // Only count payments made today by this collector
              if (dateStr.startsWith(todayStr)) {
                final amt = (entry['amount'] as num).toDouble();
                total += amt;
                visitedCustomers.add(billing.customerId);
                
                payments.add({
                  'customerName': billing.customerName,
                  'amount': amt,
                  'date': dateStr,
                  'note': entry['note'] ?? '',
                });
              }
            }
          }
        } catch (_) {}
      }
      
      payments.sort((a, b) => (b['date'] as String).compareTo(a['date'] as String));
      
      if (mounted) {
        setState(() {
          _totalCollected = total;
          _customersVisited = visitedCustomers.length;
          _todayPayments = payments;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayFormatted = DateFormat('EEEE, MMM d, yyyy').format(DateTime.now());
    
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppTheme.textPrimary,
        centerTitle: true,
        title: Text('Daily Summary', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 16)),
      ),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDailyStats,
              color: AppTheme.accentBlue,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Date
                    Text(todayFormatted, style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textMuted, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 16),
                    
                    // Main Stat Card
                    PopInBounce(
                      delay: const Duration(milliseconds: 100),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
                      decoration: BoxDecoration(
                        gradient: AppTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(color: AppTheme.accentBlue.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 8)),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('Total Collected Today', style: GoogleFonts.inter(fontSize: 14, color: Colors.white.withValues(alpha: 0.9), fontWeight: FontWeight.w500)),
                          const SizedBox(height: 8),
                          Text('₱${NumberFormat('#,##0').format(_totalCollected)}', style: GoogleFonts.outfit(fontSize: 40, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -1)),
                        ],
                      ),
                    ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Mini Stats
                    PopInBounce(
                      delay: const Duration(milliseconds: 150),
                      child: Row(
                        children: [
                          _buildMiniStat('Customers Visited', _customersVisited.toString(), Icons.people_outline),
                        const SizedBox(width: 16),
                        _buildMiniStat('Transactions', _todayPayments.length.toString(), Icons.receipt_long_outlined),
                      ],
                    ),
                    ),
                    const SizedBox(height: 32),
                    
                    // Transactions List
                    Text('Today\'s Transactions', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                    const SizedBox(height: 16),
                    
                    if (_todayPayments.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          children: [
                            Icon(Icons.inbox_outlined, size: 48, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                            const SizedBox(height: 16),
                            Text('No collections yet today', style: GoogleFonts.inter(color: AppTheme.textMuted)),
                          ],
                        ),
                      )
                    else
                      ..._todayPayments.asMap().entries.map((e) => _buildTransactionCard(e.value, e.key)),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppTheme.accentBlue.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(icon, size: 20, color: AppTheme.accentBlue),
            ),
            const SizedBox(height: 12),
            Text(value, style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            Text(label, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> payment, int index) {
    final dateStr = payment['date'] as String;
    String timeStr = '';
    try {
      timeStr = DateFormat('h:mm a').format(DateTime.parse(dateStr).toLocal());
    } catch (_) {}

    return PopInBounce(
      delay: Duration(milliseconds: 200 + (50 * index)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppTheme.accentEmerald.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: const Icon(Icons.check, size: 20, color: AppTheme.accentEmerald),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(payment['customerName'], style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                const SizedBox(height: 4),
                Text(timeStr, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
          Text('₱${NumberFormat('#,##0').format(payment['amount'])}', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        ],
      ),
      ),
    );
  }
}
