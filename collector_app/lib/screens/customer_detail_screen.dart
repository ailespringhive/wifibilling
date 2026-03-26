import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/billing_service.dart';
import '../models/billing.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';

class CustomerDetailScreen extends StatefulWidget {
  const CustomerDetailScreen({super.key});

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  final BillingService _billingService = BillingService();

  List<Billing> _billings = [];
  bool _isLoading = true;
  bool _isUpdating = false;

  UserProfile? _customer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_customer == null) {
      _customer =
          ModalRoute.of(context)!.settings.arguments as UserProfile;
      _loadBillings();
    }
  }

  Future<void> _loadBillings() async {
    setState(() => _isLoading = true);
    try {
      final billings =
          await _billingService.getBillingsByCustomer(_customer!.userId);
      setState(() {
        _billings = billings;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateBillingStatus(
      Billing billing, String newStatus) async {
    final auth = context.read<AuthService>();
    setState(() => _isUpdating = true);

    try {
      await _billingService.updateStatus(
        billing.id,
        newStatus,
        collectedBy: auth.collectorId,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              newStatus == 'already_paid'
                  ? 'Payment recorded successfully!'
                  : 'Status updated to Payment Confirmation',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: AppTheme.accentEmerald,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        await _loadBillings();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update: $e',
                style: GoogleFonts.inter()),
            backgroundColor: AppTheme.accentRose,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  void _showStatusSheet(Billing billing) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: const Border(
            top: BorderSide(color: AppTheme.border),
            left: BorderSide(color: AppTheme.border),
            right: BorderSide(color: AppTheme.border),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.textMuted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Update Payment Status',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${billing.billingMonth} · ₱${NumberFormat('#,##0').format(billing.amount)}',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppTheme.textMuted,
              ),
            ),
            const SizedBox(height: 28),

            // Mark as Paid button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.accentEmerald, Color(0xFF10B981)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.accentEmerald.withValues(alpha: 0.2),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton.icon(
                  onPressed: _isUpdating
                      ? null
                      : () {
                          Navigator.pop(ctx);
                          _updateBillingStatus(billing, 'already_paid');
                        },
                  icon: const Icon(Icons.check_circle_outlined, size: 20),
                  label: Text('Mark as Paid',
                      style: GoogleFonts.inter(
                          fontWeight: FontWeight.w600, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Payment Confirmation button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: _isUpdating
                    ? null
                    : () {
                        Navigator.pop(ctx);
                        _updateBillingStatus(
                            billing, 'payment_confirmation');
                      },
                icon: const Icon(Icons.pending_outlined, size: 20),
                label: Text('Payment Confirmation',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600, fontSize: 15)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.accentPurple,
                  side: const BorderSide(color: AppTheme.accentPurple),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_customer == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text(_customer!.fullName),
        backgroundColor: AppTheme.bgDark,
      ),
      body: RefreshIndicator(
        color: AppTheme.accentBlue,
        backgroundColor: AppTheme.bgCard,
        onRefresh: _loadBillings,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Customer Info Card ──
              _buildInfoCard(),
              const SizedBox(height: 24),

              // ── Billing History Header ──
              Row(
                children: [
                  Text(
                    'Billing History',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  if (_billings.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.accentBlue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${_billings.length} records',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.accentBlue,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // ── Billing List ──
              if (_isLoading)
                ..._buildShimmer()
              else if (_billings.isEmpty)
                _buildEmptyBilling()
              else
                ..._billings.map((b) => _buildBillingCard(b)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: AppTheme.glassCard(radius: 20),
      child: Column(
        children: [
          // Avatar + name
          Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  gradient:
                      AppTheme.avatarGradient(_customer!.firstName),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.accentBlue.withValues(alpha: 0.15),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _customer!.initials,
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _customer!.fullName,
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.accentBlue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Customer',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.accentBlue,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),
          Container(height: 1, color: AppTheme.border),
          const SizedBox(height: 16),

          // Details
          _infoRow(Icons.phone_outlined, 'Phone',
              _customer!.phone.isNotEmpty ? _customer!.phone : '—'),
          const SizedBox(height: 12),
          _infoRow(Icons.email_outlined, 'Email',
              _customer!.email.isNotEmpty ? _customer!.email : '—'),
          const SizedBox(height: 12),
          _infoRow(
              Icons.location_on_outlined,
              'Address',
              _customer!.address.isNotEmpty
                  ? _customer!.address
                  : '—'),
          if (_customer!.locationString.isNotEmpty) ...[
            const SizedBox(height: 12),
            _infoRow(Icons.map_outlined, 'Area',
                _customer!.locationString),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppTheme.textMuted.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: AppTheme.textMuted),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: AppTheme.textMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBillingCard(Billing billing) {
    final statusColor = AppTheme.statusColor(billing.paymentStatus);
    final dueDateStr = billing.dueDate != null
        ? DateFormat('MMM d, yyyy').format(DateTime.parse(billing.dueDate!))
        : '—';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: AppTheme.glassCard(radius: 14),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: billing.isPaid ? null : () => _showStatusSheet(billing),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Month badge
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        billing.billingMonth.length >= 7
                            ? billing.billingMonth.substring(5, 7)
                            : '??',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                        ),
                      ),
                      Text(
                        billing.billingMonth.length >= 4
                            ? billing.billingMonth.substring(0, 4)
                            : '',
                        style: GoogleFonts.inter(
                          fontSize: 9,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),

                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '₱${NumberFormat('#,##0').format(billing.amount)}',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Due: $dueDateStr',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppTheme.textMuted,
                        ),
                      ),
                      if (billing.paidDate != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            'Paid: ${DateFormat('MMM d, yyyy').format(DateTime.parse(billing.paidDate!))}',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppTheme.accentEmerald,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Status + action
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    AppTheme.statusBadge(billing.paymentStatus, billing.statusLabel),
                    if (!billing.isPaid) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Tap to update',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          color: AppTheme.textMuted,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyBilling() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: AppTheme.glassCard(),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.textMuted.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.receipt_long_outlined,
                size: 28, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 16),
          Text(
            'No billing records',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'No billing records found for this customer.',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildShimmer() {
    return List.generate(
      3,
      (_) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        height: 82,
        decoration: AppTheme.glassCard(radius: 14),
      ),
    );
  }
}
