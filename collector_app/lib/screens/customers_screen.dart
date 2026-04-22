import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/customer_service.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';
import '../widgets/pop_in_bounce.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final CustomerService _customerService = CustomerService();
  final TextEditingController _searchController = TextEditingController();

  List<UserProfile> _allCustomers = [];
  List<UserProfile> _filteredCustomers = [];
  bool _isLoading = true;
  int _currentPage = 0;

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
      final customers = await _customerService.getAssignedCustomers(auth.collectorId);

      if (mounted) {
        setState(() {
          _allCustomers = customers;
          _isLoading = false;
        });
        _applyFilters();
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredCustomers = _allCustomers.where((c) {
        final searchable = '${c.fullName} ${c.phone} ${c.barangay} ${c.city}'.toLowerCase();
        return _searchController.text.isEmpty || 
            searchable.contains(_searchController.text.toLowerCase());
      }).toList();
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
          onRefresh: _loadCustomers,
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
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
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
                          hintText: 'Search customers...',
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

                  // ── Customer Count ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        Text(
                          '${_filteredCustomers.length} customer${_filteredCustomers.length != 1 ? 's' : ''}',
                          style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // ── Customer List ──
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
                                    child: _buildCustomerCard(displayList[index]),
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

  Widget _buildCustomerCard(UserProfile customer) {
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
                'mode': 'profile',
              },
            ).then((_) {
              _loadCustomers();
            });
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                // Circular Avatar
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    gradient: AppTheme.avatarGradient(customer.firstName),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: AppTheme.accentBlue.withValues(alpha: 0.1), blurRadius: 8),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      customer.initials,
                      style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 12),

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
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.phone_outlined, size: 12, color: AppTheme.textMuted),
                          const SizedBox(width: 4),
                          Flexible(
                              child: Text(
                                customer.phone.isNotEmpty ? customer.phone : '—',
                                style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ),
                          if (customer.locationString.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.location_on_outlined, size: 12, color: AppTheme.textMuted),
                            const SizedBox(width: 3),
                            Flexible(
                                child: Text(
                                  customer.locationString,
                                  style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 8),
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
            child: const Icon(Icons.people_outline_outlined, size: 28, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 16),
          Text(
            'No customers found',
            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            'Pull to refresh or search for a customer.',
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
      itemCount: 8,
      itemBuilder: (_, __) => Container(
        height: 70,
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 8),
        decoration: AppTheme.glassCard(radius: 14),
      ),
    );
  }
}
