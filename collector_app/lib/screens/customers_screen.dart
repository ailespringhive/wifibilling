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

  void _filterCustomers(String query) {
    if (query.isEmpty) {
      setState(() => _filteredCustomers = _allCustomers);
      return;
    }
    setState(() {
      _filteredCustomers = _allCustomers.where((c) {
        final searchable =
            '${c.fullName} ${c.phone} ${c.barangay} ${c.city}'.toLowerCase();
        return searchable.contains(query.toLowerCase());
      }).toList();
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
              onChanged: _filterCustomers,
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
                          _filterCustomers('');
                        },
                      )
                    : null,
              ),
            ),
          ),
        ),

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
            );
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
                    ],
                  ),
                ),

                // Status badge
                if (billing != null)
                  AppTheme.statusBadge(billing.paymentStatus, billing.statusLabel),

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
            child: const Icon(Icons.people_outline_outlined,
                size: 28, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 16),
          Text(
            'No customers assigned',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Contact your admin to get customer assignments.',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppTheme.textMuted,
            ),
          ),
        ],
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
}
