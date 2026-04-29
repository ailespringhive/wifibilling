import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/customer_service.dart';
import '../services/billing_service.dart';
import '../models/user_profile.dart';
import '../models/billing.dart';
import '../theme/app_theme.dart';
import '../widgets/pop_in_bounce.dart';

class BillsScreen extends StatefulWidget {
  const BillsScreen({super.key});

  @override
  State<BillsScreen> createState() => _BillsScreenState();
}

class _BillsScreenState extends State<BillsScreen> {
  final CustomerService _customerService = CustomerService();
  final BillingService _billingService = BillingService();
  final TextEditingController _searchController = TextEditingController();

  List<UserProfile> _allCustomers = [];
  List<UserProfile> _filteredCustomers = [];
  Map<String, Billing?> _latestBillings = {};
  bool _isLoading = true;
  String _currentFilter = 'All';
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _loadBills();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadBills() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();

    try {
      final customers = await _customerService.getAssignedCustomers(auth.collectorId);
      final billings = await _billingService.getAssignedBillings(auth.collectorId);

      final Map<String, Billing?> billingMap = {};
      final List<UserProfile> validCustomers = [];
      
      for (final c in customers) {
        final cBillings = billings.where((b) => b.customerId == c.userId).toList();
        if (cBillings.isNotEmpty) {
          cBillings.sort((a, b) => b.billingMonth.compareTo(a.billingMonth));
          final latest = cBillings.first;
          
          // Show active and paid bills, but HIDE deleted/archived ones
          final status = latest.paymentStatus.toLowerCase();
          if (!status.contains('archived')) {
            billingMap[c.userId] = latest;
            validCustomers.add(c);
          }
        }
      }

      if (mounted) {
        setState(() {
          _allCustomers = validCustomers;
          _latestBillings = billingMap;
          _isLoading = false;
        });
        _applyFilters();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredCustomers = _allCustomers.where((c) {
        final searchable = '${c.fullName} ${c.phone} ${c.barangay} ${c.city}'.toLowerCase();
        final matchesQuery = _searchController.text.isEmpty || 
            searchable.contains(_searchController.text.toLowerCase());
            
        bool matchesStatus = true;
        if (_currentFilter != 'All') {
          final billing = _latestBillings[c.userId];
          if (billing == null) {
             matchesStatus = _currentFilter == 'not_yet_paid'; 
          } else {
             if (_currentFilter == 'not_yet_paid') {
               matchesStatus = billing.paymentStatus == 'not_yet_paid';
             } else if (_currentFilter == 'duedate') {
               matchesStatus = billing.paymentStatus == 'not_yet_paid' && billing.dueDate != null;
             } else if (_currentFilter == 'already_paid') {
               matchesStatus = billing.paymentStatus == 'already_paid';
             } else if (_currentFilter == 'overdue') {
               matchesStatus = billing.paymentStatus == 'overdue' ||
                 (billing.paymentStatus == 'not_yet_paid' && 
                  billing.dueDate != null && DateTime.parse(billing.dueDate!).isBefore(DateTime.now()));
             }
          }
        }
        return matchesQuery && matchesStatus;
      }).toList();

      if (_currentFilter == 'duedate') {
        _filteredCustomers.sort((a, b) {
          final bA = _latestBillings[a.userId];
          final bB = _latestBillings[b.userId];
          if (bA?.dueDate == null && bB?.dueDate == null) return 0;
          if (bA?.dueDate == null) return 1;
          if (bB?.dueDate == null) return -1;
          return DateTime.parse(bA!.dueDate!).compareTo(DateTime.parse(bB!.dueDate!));
        });
      }
      
      _currentPage = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    const int itemsPerPage = 5;
    final int totalPages = _filteredCustomers.isEmpty ? 1 : (_filteredCustomers.length / itemsPerPage).ceil();
    if (_currentPage >= totalPages && totalPages > 0) _currentPage = totalPages - 1;
    
    final int startIndex = _currentPage * itemsPerPage;
    final int endIndex = (startIndex + itemsPerPage > _filteredCustomers.length) ? _filteredCustomers.length : startIndex + itemsPerPage;
    final displayList = _filteredCustomers.isEmpty ? <UserProfile>[] : _filteredCustomers.sublist(startIndex, endIndex);

    return LayoutBuilder(
      builder: (context, constraints) {
        return RefreshIndicator(
          color: AppTheme.accentBlue,
          backgroundColor: Colors.white,
          onRefresh: _loadBills,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight,
              ),
              child: Column(
                children: [
                  // ── Search Bar ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: Colors.grey.shade300),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (_) => _applyFilters(),
                        style: GoogleFonts.inter(
                          color: AppTheme.textPrimary,
                          fontSize: 13,
                        ),
                        decoration: InputDecoration(
                          isDense: true,
                          prefixIconConstraints: const BoxConstraints(minWidth: 36),
                          suffixIconConstraints: const BoxConstraints(minWidth: 36),
                          prefixIcon: const Icon(Icons.search_outlined, color: AppTheme.textMuted, size: 16),
                          hintText: 'Search bills...',
                          hintStyle: GoogleFonts.inter(color: AppTheme.textMuted),
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? GestureDetector(
                                  onTap: () {
                                    _searchController.clear();
                                    _applyFilters();
                                  },
                                  child: const Icon(Icons.close_outlined, color: AppTheme.textMuted, size: 16),
                                )
                              : null,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // ── Filter Chips ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      physics: const NeverScrollableScrollPhysics(),
                      child: Row(
                        children: [
                          _buildFilterChip('All', 'All'),
                          const SizedBox(width: 6),
                          _buildFilterChip('overdue', 'Overdue'),
                          const SizedBox(width: 6),
                          _buildFilterChip('not_yet_paid', 'Unpaid'),
                          const SizedBox(width: 6),
                          _buildFilterChip('duedate', 'Due Date'),
                          const SizedBox(width: 6),
                          _buildFilterChip('already_paid', 'Paid'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Counter ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        Text(
                          '${_filteredCustomers.length} bill${_filteredCustomers.length != 1 ? 's' : ''}',
                          style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // ── List ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _isLoading
                        ? _buildShimmerList()
                        : displayList.isEmpty
                            ? _buildEmpty()
                            : ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                padding: EdgeInsets.zero,
                                itemCount: displayList.length,
                                itemBuilder: (context, index) {
                                  return PopInBounce(
                                    delay: Duration(milliseconds: 50 * index),
                                    child: _buildBillCard(displayList[index]),
                                  );
                                },
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
          ),
        );
      },
    );
  }

  Widget _buildBillCard(UserProfile customer) {
    final billing = _latestBillings[customer.userId];
    double balance = 0.0;
    if (billing != null) {
      final hasAmountPaid = billing.amountPaid != null && billing.amountPaid! > 0;
      if (hasAmountPaid && billing.amountPaid! < billing.amount) {
        balance = billing.amount - billing.amountPaid!;
      } else if (!billing.isPaid) {
        balance = billing.amount;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade300),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            Navigator.of(context).pushNamed(
              '/customer-detail',
              arguments: {
                'customer': customer,
                'mode': 'billing',
              },
            ).then((_) {
              _loadBills();
            });
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              children: [
                // Info
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        customer.fullName,
                        style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.phone_outlined, size: 11, color: AppTheme.textMuted),
                          const SizedBox(width: 4),
                          Flexible(
                              child: Text(
                                customer.phone.isNotEmpty ? customer.phone : '—',
                                style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ),
                        ],
                      ),
                      if (billing != null) ...[
                        if (billing.paymentStatus == 'already_paid') ...[
                          const SizedBox(height: 1),
                          Row(
                            children: [
                              const Icon(Icons.event_available_outlined, size: 11, color: AppTheme.accentEmerald),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  'Covered: ${() {
                                    try {
                                      final parts = billing.billingMonth.split('-');
                                      if (parts.length >= 2) {
                                        final d = DateTime(int.parse(parts[0]), int.parse(parts[1]));
                                        return DateFormat('MMM yyyy').format(d);
                                      }
                                      return billing.billingMonth;
                                    } catch (_) { return billing.billingMonth; }
                                  }()}',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accentEmerald),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ] else if (billing.dueDate != null && billing.dueDate!.isNotEmpty) ...[
                          const SizedBox(height: 1),
                          Row(
                            children: [
                              const Icon(Icons.event_outlined, size: 11, color: AppTheme.accentAmber),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  'Due: ${() {
                                    try {
                                      final d = DateTime.parse(billing.dueDate!).toLocal();
                                      return DateFormat('MMM dd, yyyy').format(d);
                                    } catch (_) { return billing.dueDate!; }
                                  }()}',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.accentAmber),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                      if (balance > 0) ...[
                        const SizedBox(height: 1),
                        Row(
                          children: [
                            const Icon(Icons.account_balance_wallet_outlined, size: 11, color: AppTheme.accentRose),
                            const SizedBox(width: 4),
                            Flexible(
                                child: Text(
                                  'Balance: ₱${NumberFormat('#,##0').format(balance)}',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accentRose),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

                const SizedBox(width: 8),

                if (billing != null)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 80),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: AppTheme.statusBadge(billing.paymentStatus, billing.statusLabel),
                    ),
                  ),

                const SizedBox(width: 2),
                const Icon(Icons.chevron_right_outlined, color: AppTheme.textMuted, size: 18),
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
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.textMuted.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.receipt_long_outlined, size: 28, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 16),
          Text(
            'No bills found',
            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            'Pull to refresh or change filters.',
            style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmerList() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      itemCount: 5,
      itemBuilder: (_, _) => Container(
        height: 80,
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 6),
        decoration: AppTheme.glassCard(radius: 14),
      ),
    );
  }

  Widget _buildFilterChip(String filterId, String label) {
    final isSelected = _currentFilter == filterId;
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentFilter = filterId;
        });
        _applyFilters();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.grey.shade700 : Colors.white,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: isSelected ? Colors.grey.shade700 : Colors.grey.shade200,
            width: 1,
          ),
          boxShadow: isSelected
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.grey.shade700,
          ),
        ),
      ),
    );
  }
}
