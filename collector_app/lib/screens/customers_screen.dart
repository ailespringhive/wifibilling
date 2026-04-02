import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/customer_service.dart';
import '../services/billing_service.dart';
import '../models/user_profile.dart';
import '../models/billing.dart';
import '../theme/app_theme.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final CustomerService _customerService = CustomerService();
  final BillingService _billingService = BillingService();
  final TextEditingController _searchController = TextEditingController();

  List<UserProfile> _allCustomers = [];
  List<UserProfile> _filteredCustomers = [];
  Map<String, Billing?> _latestBillings = {};
  bool _isLoading = true;
  String _currentFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();

    try {
      final customers =
          await _customerService.getAssignedCustomers(auth.collectorId);
      final billings =
          await _billingService.getAssignedBillings(auth.collectorId);

      final Map<String, Billing?> billingMap = {};
      for (final c in customers) {
        final cBillings =
            billings.where((b) => b.customerId == c.userId).toList();
        if (cBillings.isNotEmpty) {
          cBillings.sort((a, b) => b.billingMonth.compareTo(a.billingMonth));
          billingMap[c.userId] = cBillings.first;
        }
      }

      setState(() {
        _allCustomers = customers;
        _filteredCustomers = customers;
        _latestBillings = billingMap;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredCustomers = _allCustomers.where((c) {
        // Query match
        final searchable = '${c.fullName} ${c.phone} ${c.barangay} ${c.city}'.toLowerCase();
        final matchesQuery = _searchController.text.isEmpty || 
            searchable.contains(_searchController.text.toLowerCase());
            
        // Status match
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
               matchesStatus = billing.paymentStatus == 'not_yet_paid' && 
                 billing.dueDate != null && DateTime.parse(billing.dueDate!).isBefore(DateTime.now());
             }
          }
        }
        return matchesQuery && matchesStatus;
      }).toList();

      // Sort by due date if the 'duedate' filter is active
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
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── Search Bar ──
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Container(
            decoration: AppTheme.glassCard(radius: 14),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => _applyFilters(),
              style: GoogleFonts.inter(
                color: AppTheme.textPrimary,
                fontSize: 14,
              ),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search_outlined,
                    color: AppTheme.textMuted, size: 20),
                hintText: 'Search customers...',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_outlined,
                            color: AppTheme.textMuted, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _applyFilters();
                        },
                      )
                    : null,
              ),
            ),
          ),
        ),

        // ── Filter Chips ──
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            children: [
              _buildFilterChip('All', 'All'),
              const SizedBox(width: 8),
              _buildFilterChip('overdue', 'Overdue'),
              const SizedBox(width: 8),
              _buildFilterChip('not_yet_paid', 'Unpaid'),
              const SizedBox(width: 8),
              _buildFilterChip('duedate', 'Due Date'),
              const SizedBox(width: 8),
              _buildFilterChip('already_paid', 'Paid'),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // ── Customer Count ──
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              Text(
                '${_filteredCustomers.length} customer${_filteredCustomers.length != 1 ? 's' : ''}',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: AppTheme.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // ── Customer List ──
        Expanded(
          child: _isLoading
              ? _buildShimmerList()
              : _filteredCustomers.isEmpty
                  ? _buildEmpty()
                  : RefreshIndicator(
                      color: AppTheme.accentBlue,
                      backgroundColor: AppTheme.bgCard,
                      onRefresh: _loadCustomers,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                        physics: const AlwaysScrollableScrollPhysics(),
                        itemCount: _filteredCustomers.length,
                        itemBuilder: (context, index) {
                          return _buildCustomerCard(
                              _filteredCustomers[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildCustomerCard(UserProfile customer) {
    final billing = _latestBillings[customer.userId];
    final statusColor = billing != null
        ? AppTheme.statusColor(billing.paymentStatus)
        : AppTheme.textMuted;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: AppTheme.glassCard(radius: 14),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            Navigator.of(context).pushNamed(
              '/customer-detail',
              arguments: customer,
            ).then((_) {
              // Refresh when returning in case data was changed
              _loadCustomers();
            });
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Circular Avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient:
                        AppTheme.avatarGradient(customer.firstName),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.accentBlue.withValues(alpha: 0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      customer.initials,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        customer.fullName,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.phone_outlined,
                              size: 13, color: AppTheme.textMuted),
                          const SizedBox(width: 4),
                          Text(
                            customer.phone.isNotEmpty
                                ? customer.phone
                                : '—',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppTheme.textMuted,
                            ),
                          ),
                          if (customer.locationString.isNotEmpty) ...[
                            const SizedBox(width: 10),
                            const Icon(Icons.location_on_outlined,
                                size: 13, color: AppTheme.textMuted),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                customer.locationString,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppTheme.textMuted,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (billing != null && billing.dueDate != null && billing.dueDate!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.event_outlined, size: 13, color: AppTheme.accentAmber),
                            const SizedBox(width: 4),
                            Text(
                              'Due: ${() {
                                try {
                                  final d = DateTime.parse(billing.dueDate!);
                                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                  return '${months[d.month - 1]} ${d.day}, ${d.year}';
                                } catch(_) { return billing.dueDate!; }
                              }()}',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.accentAmber,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

                // Status badge
                if (billing != null)
                  Container(
                    constraints: const BoxConstraints(maxWidth: 85),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: AppTheme.statusBadge(billing.paymentStatus, billing.statusLabel),
                    ),
                  ),

                const SizedBox(width: 4),
                const Icon(Icons.chevron_right_outlined,
                    color: AppTheme.textMuted, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return RefreshIndicator(
      color: AppTheme.accentBlue,
      backgroundColor: AppTheme.bgCard,
      onRefresh: _loadCustomers,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Container(
          height: MediaQuery.of(context).size.height * 0.5,
          alignment: Alignment.center,
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
                child: const Icon(Icons.people_outline_outlined,
                    size: 28, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 16),
              Text(
                'No customers found',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Pull to refresh or check assigning logic.',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppTheme.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildShimmerList() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: 6,
      itemBuilder: (context, index) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        height: 80,
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
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppTheme.accentBlue.withValues(alpha: 0.2) 
              : AppTheme.textMuted.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected 
                ? AppTheme.accentBlue.withValues(alpha: 0.5) 
                : Colors.transparent,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              color: isSelected ? AppTheme.accentBlue : AppTheme.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

