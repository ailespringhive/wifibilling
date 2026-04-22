import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/billing_service.dart';
import '../models/billing.dart';
import '../theme/app_theme.dart';
import '../services/customer_service.dart';
import '../models/user_profile.dart';

class CollectionHistoryScreen extends StatefulWidget {
  const CollectionHistoryScreen({super.key});

  @override
  State<CollectionHistoryScreen> createState() =>
      _CollectionHistoryScreenState();
}

class _CollectionHistoryScreenState extends State<CollectionHistoryScreen> {
  final BillingService _billingService = BillingService();
  final CustomerService _customerService = CustomerService();

  List<Billing> _collections = [];
  Map<String, UserProfile> _customers = {};
  bool _isLoading = true;
  double _totalAmount = 0;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();

    try {
      final collections = await _billingService.getCollectionHistory(auth.collectorId);
      final customers = await _customerService.getAssignedCustomers(auth.collectorId);
      
      final customerMap = {for (var c in customers) c.userId: c};
      final total = collections.fold<double>(0, (sum, b) => sum + ((b.amountPaid != null && b.amountPaid! > 0) ? b.amountPaid! : b.amount));

      setState(() {
        _collections = collections;
        _customers = customerMap;
        _totalAmount = total;
        _isLoading = false;
        _currentPage = 0;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const int itemsPerPage = 5;
    final int totalPages = _collections.isEmpty ? 1 : (_collections.length / itemsPerPage).ceil();
    if (_currentPage >= totalPages && totalPages > 0) _currentPage = totalPages - 1;
    
    final int startIndex = _currentPage * itemsPerPage;
    final int endIndex = (startIndex + itemsPerPage > _collections.length) ? _collections.length : startIndex + itemsPerPage;
    final displayList = _collections.isEmpty ? <Billing>[] : _collections.sublist(startIndex, endIndex);

    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: constraints.maxHeight,
              maxHeight: constraints.maxHeight,
            ),
            child: Column(
              children: [
                // ── Summary Card ──
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accentBlue.withValues(alpha: 0.04),
                          blurRadius: 15,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppTheme.accentBlue.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.account_balance_wallet_outlined,
                            color: AppTheme.accentBlue,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total Collected',
                                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade500),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _isLoading
                                    ? '—'
                                    : '₱${NumberFormat('#,##0.00').format(_totalAmount)}',
                                style: GoogleFonts.outfit( // Using the requested nice font
                                  fontSize: 32,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF1A1A1A),
                                  letterSpacing: -1.0,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.accentBlue.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: [
                              Text(
                                '${_collections.length}',
                                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.accentBlue),
                              ),
                              Text(
                                'payments',
                                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.accentBlue),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ── History List ──
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _isLoading
                        ? _buildShimmer()
                        : displayList.isEmpty
                            ? _buildEmpty()
                            : Column(
                                children: [
                                  for (final b in displayList)
                                    Expanded(child: _buildHistoryCard(b)),
                                  for (int i = 0; i < (itemsPerPage - displayList.length); i++)
                                    const Expanded(child: SizedBox.shrink()),
                                ],
                              ),
                  ),
                ),

                // ── Pagination Controls ──
                if (totalPages > 1)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        GestureDetector(
                          onTap: _currentPage > 0 ? () => setState(() => _currentPage--) : null,
                          behavior: HitTestBehavior.opaque,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                            child: Icon(
                              Icons.chevron_left,
                              size: 22,
                              color: _currentPage > 0 ? AppTheme.accentBlue : AppTheme.textMuted.withValues(alpha: 0.3),
                            ),
                          ),
                        ),
                        Text(
                          'Page ${_currentPage + 1} of $totalPages',
                          style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
                        ),
                        GestureDetector(
                          onTap: _currentPage < totalPages - 1 ? () => setState(() => _currentPage++) : null,
                          behavior: HitTestBehavior.opaque,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                            child: Icon(
                              Icons.chevron_right,
                              size: 22,
                              color: _currentPage < totalPages - 1 ? AppTheme.accentBlue : AppTheme.textMuted.withValues(alpha: 0.3),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  const SizedBox(height: 12),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHistoryCard(Billing billing) {
    final paidDateStr = billing.paidDate != null
        ? DateFormat('MMM d, yyyy · h:mm a').format(DateTime.parse(billing.paidDate!).toLocal())
        : '—';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            // Retrieve customer or build a fallback
            final customer = _customers[billing.customerId] ??
                UserProfile(
                  id: billing.customerId,
                  userId: billing.customerId,
                  firstName: billing.customerName ?? 'Unknown',
                  lastName: '',
                  role: 'customer',
                );

            final auth = context.read<AuthService>();
            final collectorName = auth.currentProfile?.fullName;

            Navigator.pushNamed(
              context,
              '/receipt-preview',
              arguments: {
                'billing': billing,
                'customer': customer,
                'amountPaid': (billing.amountPaid != null && billing.amountPaid! > 0)
                        ? billing.amountPaid!
                        : billing.amount,
                'collectorName': collectorName,
              },
            );
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              children: [
                // Circular check icon
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppTheme.accentEmerald.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_outlined,
                    color: AppTheme.accentEmerald,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),

                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        billing.customerName ?? billing.customerId.substring(0, 12),
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF1A1A1A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        paidDateStr,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),

                // Amount
                Text(
                  '₱${NumberFormat('#,##0').format((billing.amountPaid != null && billing.amountPaid! > 0) ? billing.amountPaid! : billing.amount)}',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.accentEmerald,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.history_outlined, size: 24, color: Colors.grey.shade500),
          ),
          const SizedBox(height: 12),
          Text(
            'No collections yet',
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600, color: const Color(0xFF1A1A1A)),
          ),
          const SizedBox(height: 4),
          Text(
            'Your collected payments will appear here.',
            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return Column(
      children: List.generate(
        5,
        (i) => Expanded(
          child: Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            decoration: AppTheme.glassCard(radius: 14),
          ),
        ),
      ),
    );
  }
}
