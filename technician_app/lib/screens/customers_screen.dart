import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/customer_service.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';
import '../widgets/pop_in_bounce.dart';
import 'package:hugeicons/hugeicons.dart';

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
    try {
      final customers = await _customerService.getAllCustomers(limit: 500);
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
    final int totalPages =
        _filteredCustomers.isEmpty ? 1 : (_filteredCustomers.length / itemsPerPage).ceil();
    if (_currentPage >= totalPages && totalPages > 0) _currentPage = totalPages - 1;

    final int startIndex = _currentPage * itemsPerPage;
    final int endIndex = (startIndex + itemsPerPage > _filteredCustomers.length)
        ? _filteredCustomers.length
        : startIndex + itemsPerPage;
    final displayList =
        _filteredCustomers.isEmpty ? <UserProfile>[] : _filteredCustomers.sublist(startIndex, endIndex);

    return LayoutBuilder(
      builder: (context, constraints) {
        return RefreshIndicator(
          color: AppTheme.accentBlue,
          backgroundColor: Colors.white,
          onRefresh: _loadCustomers,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                children: [
                  // ── Search & Header Section ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                    child: Row(
                      children: [
                        // Search Bar
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
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
                                prefixIcon: Padding(
                                  padding: const EdgeInsets.all(10.0),
                                  child: HugeIcon(
                                      icon: HugeIcons.strokeRoundedSearch01,
                                      color: AppTheme.textMuted,
                                      size: 16.0),
                                ),
                                hintText: 'Search...',
                                hintStyle: GoogleFonts.inter(color: AppTheme.textMuted),
                                filled: false,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding:
                                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                suffixIcon: _searchController.text.isNotEmpty
                                    ? GestureDetector(
                                        onTap: () {
                                          _searchController.clear();
                                          _applyFilters();
                                        },
                                        child: HugeIcon(
                                            icon: HugeIcons.strokeRoundedCancel01,
                                            color: AppTheme.textMuted,
                                            size: 16.0),
                                      )
                                    : null,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 12),

                        // Customer Count Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(24),
                          ),
                          alignment: Alignment.center,
                          child: RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: '${_filteredCustomers.length} ',
                                  style: GoogleFonts.inter(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.textPrimary),
                                ),
                                TextSpan(
                                  text: _filteredCustomers.length == 1 ? 'Customer' : 'Customers',
                                  style: GoogleFonts.inter(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: AppTheme.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // ── Customer List ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _isLoading
                        ? _buildShimmerList()
                        : displayList.isEmpty
                            ? _buildEmpty()
                            : Column(
                                children: [
                                  for (int i = 0; i < displayList.length; i++)
                                    PopInBounce(
                                      delay: Duration(milliseconds: i * 80 + 100),
                                      child: _buildCustomerCard(displayList[i]),
                                    ),
                                ],
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
                              child: HugeIcon(
                                icon: HugeIcons.strokeRoundedArrowLeft01,
                                size: 22.0,
                                color: _currentPage > 0
                                    ? AppTheme.accentBlue
                                    : AppTheme.textMuted.withValues(alpha: 0.3),
                              ),
                            ),
                          ),
                          Text(
                            'Page ${_currentPage + 1} of $totalPages',
                            style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
                          ),
                          GestureDetector(
                            onTap: _currentPage < totalPages - 1
                                ? () => setState(() => _currentPage++)
                                : null,
                            behavior: HitTestBehavior.opaque,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                              child: HugeIcon(
                                icon: HugeIcons.strokeRoundedArrowRight01,
                                size: 22.0,
                                color: _currentPage < totalPages - 1
                                    ? AppTheme.accentBlue
                                    : AppTheme.textMuted.withValues(alpha: 0.3),
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
    final colorHash = customer.fullName.hashCode;
    final hue = (colorHash % 360).toDouble();
    final avatarColor = HSLColor.fromAHSL(1.0, hue, 0.65, 0.35).toColor();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            Navigator.of(context).pushNamed(
              '/customer-detail',
              arguments: customer,
            ).then((_) {
              _loadCustomers();
            });
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: avatarColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      customer.initials,
                      style: GoogleFonts.inter(
                          fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        customer.fullName,
                        style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF1A1A1A),
                            letterSpacing: -0.3),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          HugeIcon(
                              icon: HugeIcons.strokeRoundedCall02,
                              color: AppTheme.textMuted,
                              size: 11.0),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              customer.phone.isNotEmpty ? customer.phone : '—',
                              style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (customer.locationString.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            HugeIcon(
                                icon: HugeIcons.strokeRoundedLocation01,
                                color: AppTheme.textMuted,
                                size: 11.0),
                            const SizedBox(width: 3),
                            Flexible(
                              child: Text(
                                customer.locationString,
                                style:
                                    GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
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
                HugeIcon(
                    icon: HugeIcons.strokeRoundedArrowRight01,
                    color: AppTheme.textMuted,
                    size: 18.0),
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
            child: HugeIcon(
                icon: HugeIcons.strokeRoundedUserGroup,
                color: AppTheme.textMuted,
                size: 28.0),
          ),
          const SizedBox(height: 16),
          Text(
            'No customers found',
            style: GoogleFonts.inter(
                fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            'Pull to refresh or try a different search.',
            style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmerList() {
    return Column(
      children: List.generate(
        5,
        (i) => Container(
          width: double.infinity,
          height: 80,
          margin: const EdgeInsets.only(bottom: 6),
          decoration: AppTheme.glassCard(radius: 14),
        ),
      ),
    );
  }
}
