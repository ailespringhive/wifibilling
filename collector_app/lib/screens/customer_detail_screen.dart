import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:appwrite/appwrite.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../config/appwrite_config.dart';
import '../models/user_profile.dart';
import '../models/billing.dart';
import '../services/billing_service.dart';
import '../services/auth_service.dart';

import '../services/ticket_service.dart';
import '../theme/app_theme.dart';
import '../widgets/location_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class CustomerDetailScreen extends StatefulWidget {
  const CustomerDetailScreen({super.key});

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  UserProfile? _customer;
  bool _initialized = false;
  String _mode = 'billing';
  bool _isLoadingBillings = true;

  final BillingService _billingService = BillingService();
  List<Billing> _billings = [];
  Billing? _currentBilling;

  // Payment dialog state
  final TextEditingController _paymentAmountCtrl = TextEditingController();
  final TextEditingController _paymentNotesCtrl = TextEditingController();

  @override
  void dispose() {
    _paymentAmountCtrl.dispose();
    _paymentNotesCtrl.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      final args = ModalRoute.of(context)!.settings.arguments;
      if (args is Map<String, dynamic>) {
        _customer = args['customer'];
        _mode = args['mode'] ?? 'billing';
        if (_mode == 'billing') {
          _loadBillings();
        }
      } else if (args is UserProfile) {
        _customer = args;
        _loadBillings();
      } else if (args is String) {
        _loadCustomerById(args);
      }
    }
  }

  Future<void> _loadCustomerById(String customerId) async {
    try {
      final databases = AppwriteService().databases;
      try {
        final doc = await databases.getDocument(
          databaseId: appwriteDatabaseId,
          collectionId: AppCollections.usersProfile,
          documentId: customerId,
        );
        final docMap = Map<String, dynamic>.from(doc.data as Map);
        docMap[r'$id'] = doc.$id;
        docMap[r'$createdAt'] = doc.$createdAt;
        _customer = UserProfile.fromJson(docMap);
      } catch (_) {
        final response = await databases.listDocuments(
          databaseId: appwriteDatabaseId,
          collectionId: AppCollections.usersProfile,
          queries: [Query.equal('userId', customerId), Query.limit(1)],
        );
        if (response.documents.isNotEmpty) {
          final firstDoc = response.documents.first;
          final listMap = Map<String, dynamic>.from(firstDoc.data as Map);
          listMap[r'$id'] = firstDoc.$id;
          listMap[r'$createdAt'] = firstDoc.$createdAt;
          _customer = UserProfile.fromJson(listMap);
        }
      }
      if (mounted) {
        setState(() {});
        _loadBillings();
      }
    } catch (e) {
      if (mounted) setState(() {});
    }
  }

  Future<void> _loadBillings() async {
    if (_customer == null) return;
    setState(() => _isLoadingBillings = true);
    try {
      final billings = await _billingService.getBillingsByCustomer(_customer!.userId);
      billings.sort((a, b) => b.billingMonth.compareTo(a.billingMonth));
      
      // Find the latest unpaid/overdue billing for payment
      Billing? current;
      for (final b in billings) {
        if (!b.isPaid) {
          current = b;
          break;
        }
      }
      // If all paid, just show the latest
      current ??= billings.isNotEmpty ? billings.first : null;

      if (mounted) {
        setState(() {
          _billings = billings;
          _currentBilling = current;
          _isLoadingBillings = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingBillings = false);
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM dd, yyyy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }

  String _billingPeriodLabel(String month) {
    if (month.isEmpty) return '—';
    if (month.contains(' ') && !month.contains('-')) return month;
    final parts = month.split('-');
    if (parts.length < 2) return month;
    try {
      final date = DateTime(int.parse(parts[0]), int.parse(parts[1]));
      return DateFormat('MMMM yyyy').format(date);
    } catch (_) {
      return month;
    }
  }

  void _showCollectPaymentDialog() {
    if (_currentBilling == null || _currentBilling!.isPaid) return;
    
    final billing = _currentBilling!;
    final balance = billing.amount - (billing.amountPaid ?? 0);
    _paymentAmountCtrl.text = balance.toStringAsFixed(0);
    _paymentNotesCtrl.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _PaymentBottomSheet(
        billing: billing,
        balance: balance,
        amountController: _paymentAmountCtrl,
        notesController: _paymentNotesCtrl,
        onCollect: (double amount, String notes) async {
          Navigator.of(ctx).pop();
          await _processPayment(billing, amount, notes);
        },
      ),
    );
  }

  /// Parse existing payment log from billing notes
  List<Map<String, dynamic>> _parsePaymentLog(String? notes) {
    if (notes == null || notes.isEmpty) return [];
    try {
      final decoded = jsonDecode(notes);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
    } catch (_) {}
    return [];
  }

  /// Build updated notes JSON with new payment entry appended
  String _buildPaymentLogNotes(String? existingNotes, double amount, String collector, String? userNote) {
    final log = _parsePaymentLog(existingNotes);
    log.add({
      'amount': amount,
      'date': DateTime.now().toIso8601String(),
      'collector': collector,
      if (userNote != null && userNote.isNotEmpty) 'note': userNote,
    });
    return jsonEncode(log);
  }

  Future<void> _processPayment(Billing billing, double amountPaid, String notes) async {
    final auth = context.read<AuthService>();
    final collectorName = auth.currentProfile?.fullName ?? 'Collector';
    
    final planRate = billing.amount;
    final currentBalance = planRate - (billing.amountPaid ?? 0);
    final newTotalPaid = (billing.amountPaid ?? 0) + amountPaid;
    final isFullyPaid = newTotalPaid >= planRate;
    final paymentDate = DateTime.now().toIso8601String();

    // Build payment log
    final updatedNotes = _buildPaymentLogNotes(billing.notes, amountPaid, collectorName, notes.isNotEmpty ? notes : null);
    
    try {
      // 1. Update current billing
      await _billingService.updateStatus(
        billing.id,
        isFullyPaid ? 'already_paid' : 'not_yet_paid',
        collectedBy: collectorName,
        amountPaid: isFullyPaid ? planRate : newTotalPaid,
        notes: updatedNotes,
      );

      // 2. Notify admin dashboard (fire-and-forget — never blocks the receipt flow)
      _billingService.sendAdminPaymentNotification(
        collectorId: auth.collectorId,
        collectorName: collectorName,
        customerName: _customer?.fullName ?? billing.customerName ?? 'Customer',
        amountPaid: amountPaid,
        billingMonth: billing.billingMonth,
        isFullyPaid: isFullyPaid,
      ).catchError((e) => debugPrint('[CustomerDetail] Admin notif error: $e'));

      // 2. Handle advance payment (overpayment beyond plan rate)
      int advanceMonths = 0;
      double remaining = 0;
      if (isFullyPaid && amountPaid > currentBalance) {
        final overpayment = amountPaid - currentBalance;
        advanceMonths = (overpayment / planRate).floor();
        remaining = overpayment - (advanceMonths * planRate);

        String nextMonth = billing.billingMonth.length >= 7
            ? billing.billingMonth.substring(0, 7)
            : billing.billingMonth;

        for (int i = 0; i < advanceMonths; i++) {
          nextMonth = _nextBillingMonth(nextMonth);
          
          // Check if billing already exists for this month
          final exists = await _billingService.billingExistsForMonth(billing.customerId, nextMonth);
          if (!exists) {
            await _billingService.createAdvanceBilling(
              customerId: billing.customerId,
              customerName: billing.customerName ?? _customer?.fullName ?? '',
              subscriptionId: billing.subscriptionId,
              billingMonth: nextMonth,
              amount: planRate,
              amountPaid: planRate,
              collectedBy: collectorName,
            );
          }
        }

        // Handle remaining partial amount for the next month after full advances
        if (remaining > 0) {
          final partialMonth = _nextBillingMonth(nextMonth);
          final partialExists = await _billingService.billingExistsForMonth(billing.customerId, partialMonth);
          if (!partialExists) {
            await _billingService.createAdvanceBilling(
              customerId: billing.customerId,
              customerName: billing.customerName ?? _customer?.fullName ?? '',
              subscriptionId: billing.subscriptionId,
              billingMonth: partialMonth,
              amount: planRate,
              amountPaid: remaining,
              collectedBy: collectorName,
              isFullyPaid: false,
            );
          }
        }
      }

      if (mounted) {
        // Show advance info snackbar
        if (advanceMonths > 0 || remaining > 0) {
          final lastMonth = _computeLastCoveredMonth(billing.billingMonth, advanceMonths);
          String advanceMsg = 'Payment covers through $lastMonth';
          if (remaining > 0) {
            final partialMonth = _computeLastCoveredMonth(billing.billingMonth, advanceMonths + 1);
            advanceMsg += ' + ₱${remaining.toStringAsFixed(0)} partial for $partialMonth';
          }
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ $advanceMsg'),
              backgroundColor: AppTheme.accentBlue,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              duration: const Duration(seconds: 4),
            ),
          );
        }

        // Navigate to receipt with THIS payment's amount (not cumulative)
        Navigator.pushNamed(
          context,
          '/receipt-preview',
          arguments: {
            'billing': Billing(
              id: billing.id,
              customerId: billing.customerId,
              subscriptionId: billing.subscriptionId,
              billingMonth: billing.billingMonth,
              amount: billing.amount,
              paymentStatus: isFullyPaid ? 'already_paid' : 'not_yet_paid',
              dueDate: billing.dueDate,
              paidDate: paymentDate,
              collectedBy: collectorName,
              notes: updatedNotes,
              customerName: billing.customerName,
              createdAt: billing.createdAt,
              amountPaid: amountPaid,
            ),
            'customer': _customer!,
            'amountPaid': amountPaid,
            'collectorName': collectorName,
          },
        ).then((_) => _loadBillings());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment failed: $e'), backgroundColor: AppTheme.accentRose),
        );
      }
    }
  }

  /// Helper: compute next billing month from YYYY-MM format
  String _nextBillingMonth(String yearMonth) {
    final parts = yearMonth.split('-');
    if (parts.length < 2) return yearMonth;
    int y = int.parse(parts[0]);
    int m = int.parse(parts[1]);
    m++;
    if (m > 12) { m = 1; y++; }
    return '$y-${m.toString().padLeft(2, '0')}';
  }

  /// Helper: compute the label of the last covered month
  String _computeLastCoveredMonth(String startMonth, int extraMonths) {
    String month = startMonth.length >= 7 ? startMonth.substring(0, 7) : startMonth;
    for (int i = 0; i < extraMonths; i++) {
      month = _nextBillingMonth(month);
    }
    return _billingPeriodLabel(month);
  }

  void _openEditCustomer() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _EditCustomerScreen(customer: _customer!),
      ),
    ).then((updated) {
      if (updated == true) {
        // Refresh customer data
        _loadCustomerById(_customer!.userId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_customer == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_mode == 'profile') {
      return _CustomerProfileScreen(
        customer: _customer!,
        onEdit: _openEditCustomer,
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final headerHeight = 280.0;
          return RefreshIndicator(
            color: Colors.white,
            backgroundColor: const Color(0xFF6C63FF),
            onRefresh: () async {
              if (_customer != null) {
                await _loadCustomerById(_customer!.userId);
              }
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: ClampingScrollPhysics()),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Stack(
                  children: [
                    // Gradient Background
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
                          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                                    onPressed: () => Navigator.pop(context),
                                    padding: EdgeInsets.zero,
                                    alignment: Alignment.centerLeft,
                                  ),
                                  Expanded(
                                    child: Text('Customer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18, color: Colors.white), textAlign: TextAlign.center),
                                  ),
                                  const SizedBox(width: 48), // spacing for center alignment
                                ],
                              ),
                              const SizedBox(height: 20),
                              // Customer Info
                              GestureDetector(
                                onTap: _showCustomerProfile,
                                behavior: HitTestBehavior.opaque,
                                child: Row(
                                  children: [
                                    Container(
                                      width: 64,
                                      height: 64,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 2),
                                      ),
                                      child: Center(
                                        child: Text(
                                          _customer!.initials,
                                          style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
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
                                            style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 6),
                                          if (_customer!.phone.isNotEmpty)
                                            Row(
                                              children: [
                                                const Icon(Icons.phone_outlined, size: 14, color: Colors.white70),
                                                const SizedBox(width: 5),
                                                Text(_customer!.phone, style: GoogleFonts.inter(fontSize: 14, color: Colors.white70)),
                                              ],
                                            ),
                                          if (_customer!.locationString.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                const Icon(Icons.location_on_outlined, size: 14, color: Colors.white70),
                                                const SizedBox(width: 5),
                                                Expanded(
                                                  child: Text(
                                                    _customer!.locationString,
                                                    style: GoogleFonts.inter(fontSize: 13, color: Colors.white70),
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
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    
                    // White Content Area
                    Container(
                      margin: EdgeInsets.only(top: headerHeight - 24),
                      constraints: BoxConstraints(minHeight: constraints.maxHeight - (headerHeight - 24)),
                      decoration: const BoxDecoration(
                        color: AppTheme.bgDark,
                        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                      ),
                      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_isLoadingBillings)
                            _buildLoadingCard()
                          else if (_currentBilling != null)
                            _buildBillingCard(_currentBilling!),
                          
                          const SizedBox(height: 16),

                          if (!_isLoadingBillings && _currentBilling != null && !_currentBilling!.isPaid)
                            _buildCollectPaymentButton(),
                          
                          const SizedBox(height: 12),
                          _buildReportIssueButton(),

                          if (!_isLoadingBillings && _currentBilling != null && !_currentBilling!.isPaid)
                            const SizedBox(height: 20),

                          _buildPaymentHistorySection(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showCustomerProfile() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _CustomerProfileScreen(
          customer: _customer!,
          onEdit: () => _openEditCustomer(),
        ),
      ),
    ).then((updated) {
      if (updated == true) {
        _loadCustomerById(_customer!.userId);
      }
    });
  }



  Widget _buildBillingCard(Billing billing) {
    final balance = billing.amount - (billing.amountPaid ?? 0);
    final isPaid = billing.isPaid;
    final isOverdue = billing.isOverdue;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    isPaid ? Icons.check_circle : Icons.receipt_long_outlined,
                    size: 18,
                    color: isPaid ? AppTheme.accentEmerald : AppTheme.textPrimary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Current Bill',
                    style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  ),
                ],
              ),
              AppTheme.statusBadge(billing.paymentStatus, billing.statusLabel),
            ],
          ),
          const SizedBox(height: 16),

          // Billing Period
          _billInfoRow('Period', _billingPeriodLabel(billing.billingMonth)),
          const SizedBox(height: 8),
          
          // Plan Rate
          _billInfoRow('Plan Rate', '₱${NumberFormat('#,##0').format(billing.amount)}'),
          if (isPaid) _buildAdvancePaymentInfo(billing),
          const SizedBox(height: 8),

          // Due Date
          if (billing.dueDate != null && billing.dueDate!.isNotEmpty) ...[
            _billInfoRow(
              'Due Date',
              _formatDate(billing.dueDate),
              valueColor: isOverdue ? AppTheme.accentRose : AppTheme.accentAmber,
            ),
            const SizedBox(height: 8),
          ],

          // Amount Paid (if partial)
          if (billing.amountPaid != null && billing.amountPaid! > 0 && !isPaid) ...[
            _billInfoRow(
              'Amount Paid',
              '₱${NumberFormat('#,##0').format(billing.amountPaid)}',
              valueColor: AppTheme.accentEmerald,
            ),
            const SizedBox(height: 8),
          ],

          // Separator
          Container(height: 1, color: AppTheme.border.withValues(alpha: 0.5), margin: const EdgeInsets.symmetric(vertical: 4)),
          const SizedBox(height: 8),

          // Balance
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isPaid ? 'Paid' : 'Balance Due',
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textMuted),
              ),
              Text(
                isPaid 
                    ? '₱${NumberFormat('#,##0').format(billing.amountPaid ?? billing.amount)}'
                    : '₱${NumberFormat('#,##0').format(balance > 0 ? balance : billing.amount)}',
                style: GoogleFonts.outfit(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: isPaid ? AppTheme.accentEmerald : AppTheme.accentRose,
                  letterSpacing: -1,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _billInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: valueColor ?? AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  /// Shows advance payment coverage info on the billing card matching the admin panel style
  Widget _buildAdvancePaymentInfo(Billing billing) {
    String? latestPaidMonth;
    double? partialAmount;
    String? partialMonth;

    for (final b in _billings) {
      if (b.isPaid) {
        if (latestPaidMonth == null || b.billingMonth.compareTo(latestPaidMonth) > 0) {
          latestPaidMonth = b.billingMonth;
        }
      } else if (b.amountPaid != null && b.amountPaid! > 0) {
        partialAmount = b.amountPaid;
        partialMonth = b.billingMonth;
      }
    }

    // Determine current calendar month to evaluate if this bill covers future advances
    final now = DateTime.now();
    final currentCalendarMonth = "${now.year}-${now.month.toString().padLeft(2, '0')}";

    // Force display if the bill being viewed IS inherently an advance bill and paid
    String displayMonth = latestPaidMonth ?? billing.billingMonth;
    bool isAdvance = (latestPaidMonth != null && latestPaidMonth.compareTo(currentCalendarMonth) > 0) || 
                     (billing.isPaid && billing.billingMonth.compareTo(currentCalendarMonth) > 0);

    if (!isAdvance && partialAmount == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (isAdvance)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Fully covered: ${_billingPeriodLabel(displayMonth)} ✓',
              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.accentEmerald),
            ),
          ),
        if (partialAmount != null && partialMonth != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              '₱${NumberFormat('#,##0').format(partialAmount)} partial for ${_billingPeriodLabel(partialMonth)}',
              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.accentAmber),
            ),
          ),
      ],
    );
  }

  Widget _buildCollectPaymentButton() {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF059669), Color(0xFF047857)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF059669).withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: _showCollectPaymentDialog,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.payments_outlined, color: Colors.white, size: 22),
                const SizedBox(width: 10),
                Text(
                  'Collect Payment',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showReportIssueDialog() {
    final issueCtrl = TextEditingController();
    String priority = 'medium';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            backgroundColor: AppTheme.bgCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppTheme.border)),
            title: Text('Report Issue', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Issue Description', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(color: AppTheme.bgDark.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                    child: TextField(
                      controller: issueCtrl,
                      maxLines: 3,
                      style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.all(12),
                        hintText: 'Describe the problem...',
                        hintStyle: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Priority', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  const SizedBox(height: 8),
                  Row(
                    children: ['low', 'medium', 'high'].map((p) {
                      final isSelected = priority == p;
                      final Color pColor = p == 'low' ? Colors.green : (p == 'medium' ? Colors.orange : Colors.red);
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => priority = p),
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? pColor.withValues(alpha: 0.2) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isSelected ? pColor : AppTheme.border),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              p[0].toUpperCase() + p.substring(1),
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500, color: isSelected ? pColor : AppTheme.textMuted),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text('Cancel', style: GoogleFonts.inter(color: AppTheme.textMuted)),
              ),
              ElevatedButton(
                onPressed: () async {
                  if (issueCtrl.text.trim().isEmpty) return;
                  Navigator.pop(ctx);
                  
                  final error = await TicketService().createTicket(
                    _customer!.id,
                    _customer!.fullName,
                    _customer!.address,
                    issueCtrl.text.trim(),
                    priority,
                  );
                  
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(error == null ? 'Issue reported successfully' : 'Error: $error'),
                      backgroundColor: error == null ? AppTheme.accentEmerald : AppTheme.accentRose,
                      duration: const Duration(seconds: 8),
                    ));
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentRose, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                child: Text('Report', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildReportIssueButton() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.accentRose.withValues(alpha: 0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: _showReportIssueDialog,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.build_circle_outlined, color: AppTheme.accentRose, size: 22),
                const SizedBox(width: 10),
                Text(
                  'Report Issue',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.accentRose),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentHistorySection() {
    // Collect individual payment entries from all billings
    final List<Map<String, dynamic>> allPayments = [];
    for (final billing in _billings) {
      final log = _parsePaymentLog(billing.notes);
      if (log.isNotEmpty) {
        for (final entry in log) {
          allPayments.add({
            'billing': billing,
            'amount': (entry['amount'] as num?)?.toDouble() ?? 0,
            'date': entry['date'] as String? ?? '',
            'collector': entry['collector'] as String? ?? '',
            'note': entry['note'] as String? ?? '',
          });
        }
      }
    }
    // Sort newest first
    allPayments.sort((a, b) => (b['date'] as String).compareTo(a['date'] as String));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              'Payment History',
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (_isLoadingBillings)
          ...[
            _buildShimmerCard(),
            _buildShimmerCard(),
          ]
        else if (allPayments.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.textMuted.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.receipt_long_outlined, size: 22, color: AppTheme.textMuted),
                ),
                const SizedBox(height: 12),
                Text(
                  'No payments yet',
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 4),
                Text(
                  'Collected payments will appear here.',
                  style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
                ),
              ],
            ),
          )
        else
          ...allPayments.map((entry) => _buildPaymentEntryCard(entry)),
      ],
    );
  }

  Widget _buildPaymentEntryCard(Map<String, dynamic> entry) {
    final billing = entry['billing'] as Billing;
    final amount = entry['amount'] as double;
    final dateStr = entry['date'] as String;
    final collector = entry['collector'] as String;
    
    String formattedDate = '—';
    if (dateStr.isNotEmpty) {
      try {
        formattedDate = DateFormat('MMM d, yyyy · h:mm a').format(DateTime.parse(dateStr).toLocal());
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            // Navigate to receipt for THIS specific payment amount
            Navigator.pushNamed(
              context,
              '/receipt-preview',
              arguments: {
                'billing': Billing(
                  id: billing.id,
                  customerId: billing.customerId,
                  subscriptionId: billing.subscriptionId,
                  billingMonth: billing.billingMonth,
                  amount: billing.amount,
                  paymentStatus: billing.paymentStatus,
                  dueDate: billing.dueDate,
                  paidDate: dateStr,
                  collectedBy: collector,
                  notes: billing.notes,
                  customerName: billing.customerName,
                  createdAt: billing.createdAt,
                  amountPaid: amount,
                ),
                'customer': _customer!,
                'amountPaid': amount,
                'collectorName': collector,
              },
            );
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Check icon
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.accentEmerald.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle_outlined, color: AppTheme.accentEmerald, size: 18),
                ),
                const SizedBox(width: 14),

                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _billingPeriodLabel(billing.billingMonth),
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.black87),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formattedDate,
                        style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                ),

                // Amount (this specific payment)
                Text(
                  '₱${NumberFormat('#,##0').format(amount)}',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingCard() {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Center(
        child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
      ),
    );
  }

  Widget _buildShimmerCard() {
    return Container(
      height: 60,
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(14),
      ),
    );
  }
}


// ══════════════════════════════════════════════════════════════
// Customer Profile Screen (full page with back button + edit)
// ══════════════════════════════════════════════════════════════
class _CustomerProfileScreen extends StatelessWidget {
  final UserProfile customer;
  final VoidCallback onEdit;

  const _CustomerProfileScreen({
    required this.customer,
    required this.onEdit,
  });

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM dd, yyyy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }

  String _getField(String key) {
    try {
      final jsonMap = customer.toJson();
      final val = jsonMap[key];
      if (val != null && val.toString().isNotEmpty) return val.toString();
    } catch (_) {}
    return '—';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text('Customer Details', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 20)),
        backgroundColor: AppTheme.bgDark,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          // Edit (pen) icon
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: AppTheme.accentBlue.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: IconButton(
              onPressed: () {
                Navigator.of(context).pop();
                onEdit();
              },
              icon: const Icon(Icons.edit_outlined, size: 18),
              tooltip: 'Edit Customer',
              style: IconButton.styleFrom(
                foregroundColor: AppTheme.accentBlue,
                minimumSize: const Size(36, 36),
                padding: const EdgeInsets.all(8),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Avatar + Name hero
            Center(
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.15), width: 2),
                        ),
                      ),
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          gradient: AppTheme.avatarGradient(customer.firstName),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: AppTheme.accentBlue.withValues(alpha: 0.25), blurRadius: 20, offset: const Offset(0, 8)),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            customer.initials,
                            style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '${customer.firstName} ${customer.middleName} ${customer.lastName}'.trim(),
                    style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.accentBlue.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.15)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.verified_user_outlined, size: 14, color: AppTheme.accentBlue),
                        const SizedBox(width: 6),
                        Text(
                          customer.role.toUpperCase(),
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.accentBlue, letterSpacing: 1),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Personal Info
            _sectionCard('Personal Information', Icons.person_outline, [
              _detailRow('Full Name', '${customer.firstName} ${customer.middleName} ${customer.lastName}'.trim()),
              _detailRow('Phone', customer.phone.isNotEmpty ? customer.phone : '—'),
              _detailRow('Customer ID', customer.userId),
              _detailRow('Registered', _formatDate(customer.createdAt)),
            ], accentColor: AppTheme.accentBlue),
            const SizedBox(height: 16),

            // Credentials
            _sectionCard('Credentials & WiFi', Icons.lock_outline, [
              _detailRow('Facebook', _getField('facebookUrl')),
              _detailRow('PPPoE Account', _getField('pppoeUser')),
              _detailRow('PPPoE Password', _getField('pppoePassword')),
              _detailRow('WiFi Name', _getField('wifiName')),
              _detailRow('WiFi Password', _getField('wifiPassword')),
              _detailRow('Billing Date', _getField('billingStartDate')),
            ], accentColor: AppTheme.accentPurple),
            const SizedBox(height: 16),

            // Facility
            _sectionCard('Facility', Icons.router_outlined, [
              _detailRow('Napbox', _getField('napbox')),
              _detailRow('Port', _getField('wifiPort')),
            ], accentColor: AppTheme.accentEmerald),
            const SizedBox(height: 16),

            // Address
            _sectionCard('Address', Icons.location_on_outlined, [
              _detailRow('Street', customer.address.isNotEmpty ? customer.address : '—'),
              _detailRow('Barangay', customer.barangay.isNotEmpty ? customer.barangay : '—'),
              _detailRow('City', customer.city.isNotEmpty ? customer.city : '—'),
              _detailRow('Province', customer.province.isNotEmpty ? customer.province : '—'),
            ], accentColor: AppTheme.accentAmber),

            // Location Photos
            if (customer.locationPhotos.isNotEmpty) ...[
              const SizedBox(height: 12),
              _sectionCard('Location Photos', Icons.photo_library_outlined, [
                SizedBox(
                  height: 120,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: customer.locationPhotos.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) => ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        customer.locationPhotos[i],
                        width: 120,
                        height: 120,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 120,
                          height: 120,
                          color: AppTheme.bgDark,
                          child: const Icon(Icons.broken_image_outlined, color: AppTheme.textMuted),
                        ),
                      ),
                    ),
                  ),
                ),
              ]),
            ],

            // Map
            if (customer.latitude != null && customer.longitude != null) ...[
              const SizedBox(height: 12),
              _sectionCard('Location Pin', Icons.pin_drop_outlined, [
                Container(
                  height: 160,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: FlutterMap(
                    options: MapOptions(
                      initialCenter: LatLng(customer.latitude!, customer.longitude!),
                      initialZoom: 16.0,
                      interactionOptions: const InteractionOptions(
                        flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                      ),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.springhive.wifibilling.collector',
                        tileProvider: NetworkTileProvider(headers: const {'User-Agent': 'WiFiBillingApp/1.0.0 (admin@springhive.com)'}),
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(customer.latitude!, customer.longitude!),
                            width: 40,
                            height: 40,
                            child: const Icon(Icons.location_on, color: AppTheme.accentBlue, size: 32),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ]),
            ],
          ],
        ),
      ),
    );
  }

  Widget _sectionCard(String title, IconData icon, List<Widget> children, {Color? accentColor}) {
    final color = accentColor ?? AppTheme.accentBlue;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border.withValues(alpha: 0.8)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: color),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}


// ══════════════════════════════════════════════════════════════
// Payment Bottom Sheet
// ══════════════════════════════════════════════════════════════
class _PaymentBottomSheet extends StatefulWidget {
  final Billing billing;
  final double balance;
  final TextEditingController amountController;
  final TextEditingController notesController;
  final Future<void> Function(double amount, String notes) onCollect;

  const _PaymentBottomSheet({
    required this.billing,
    required this.balance,
    required this.amountController,
    required this.notesController,
    required this.onCollect,
  });

  @override
  State<_PaymentBottomSheet> createState() => _PaymentBottomSheetState();
}

class _PaymentBottomSheetState extends State<_PaymentBottomSheet> {
  bool _isProcessing = false;
  String _advancePreview = '';

  @override
  void initState() {
    super.initState();
    widget.amountController.addListener(_updateAdvancePreview);
    _updateAdvancePreview();
  }

  void _updateAdvancePreview() {
    final amount = double.tryParse(widget.amountController.text) ?? 0;
    final planRate = widget.billing.amount;
    final balance = widget.balance;
    
    if (amount > balance && planRate > 0) {
      final overpayment = amount - balance;
      final fullMonths = (overpayment / planRate).floor();
      final partial = overpayment - (fullMonths * planRate);
      
      // Compute month labels
      String currentMonth = widget.billing.billingMonth.length >= 7
          ? widget.billing.billingMonth.substring(0, 7)
          : widget.billing.billingMonth;
      
      String nextMonth = currentMonth;
      for (int i = 0; i < fullMonths; i++) {
        nextMonth = _nextMonth(nextMonth);
      }
      
      String preview = '⚡ Covers this month';
      if (fullMonths > 0) {
        preview += ' + $fullMonths month${fullMonths > 1 ? 's' : ''} advance';
      }
      if (partial > 0) {
        final partMonth = _nextMonth(nextMonth);
        preview += '\n  + ₱${partial.toStringAsFixed(0)} partial for ${_monthLabel(partMonth)}';
      }
      
      setState(() => _advancePreview = preview);
    } else {
      setState(() => _advancePreview = '');
    }
  }

  String _nextMonth(String ym) {
    final parts = ym.split('-');
    if (parts.length < 2) return ym;
    int y = int.parse(parts[0]);
    int m = int.parse(parts[1]);
    m++;
    if (m > 12) { m = 1; y++; }
    return '$y-${m.toString().padLeft(2, '0')}';
  }

  String _monthLabel(String ym) {
    final parts = ym.split('-');
    if (parts.length < 2) return ym;
    try {
      final date = DateTime(int.parse(parts[0]), int.parse(parts[1]));
      return DateFormat('MMMM yyyy').format(date);
    } catch (_) { return ym; }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Title
            Text(
              'Collect Payment',
              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              'Balance: ₱${NumberFormat('#,##0').format(widget.balance)}',
              style: GoogleFonts.inter(fontSize: 14, color: AppTheme.accentRose, fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Amount Field
            Text('Amount', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
            const SizedBox(height: 6),
            TextFormField(
              controller: widget.amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
              decoration: InputDecoration(
                prefixText: '₱ ',
                prefixStyle: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: AppTheme.textMuted),
                filled: true,
                fillColor: AppTheme.bgDark.withValues(alpha: 0.5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              ),
            ),
            const SizedBox(height: 16),

            // Quick amount buttons
            Row(
              children: [
                _quickAmountChip(widget.balance, 'Full'),
                const SizedBox(width: 8),
                if (widget.balance > 100) ...[
                  _quickAmountChip((widget.balance / 2).roundToDouble(), 'Half'),
                  const SizedBox(width: 8),
                ],
              ],
            ),
            const SizedBox(height: 12),

            // Advance payment preview
            if (_advancePreview.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.accentBlue.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.fast_forward_rounded, size: 16, color: AppTheme.accentBlue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _advancePreview,
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accentBlue, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),

            // Notes Field
            Text('Notes (optional)', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
            const SizedBox(height: 6),
            TextFormField(
              controller: widget.notesController,
              style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Add payment notes...',
                hintStyle: GoogleFonts.inter(color: AppTheme.textMuted),
                filled: true,
                fillColor: AppTheme.bgDark.withValues(alpha: 0.5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
            const SizedBox(height: 24),

            // Collect Button
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF047857)],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF059669).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: _isProcessing ? null : () async {
                    final amount = double.tryParse(widget.amountController.text) ?? 0;
                    if (amount <= 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Enter a valid amount'), backgroundColor: AppTheme.accentRose),
                      );
                      return;
                    }
                    setState(() => _isProcessing = true);
                    await widget.onCollect(amount, widget.notesController.text.trim());
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_isProcessing)
                          const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        else ...[
                          const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Confirm & Print Receipt',
                            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickAmountChip(double amount, String label) {
    return GestureDetector(
      onTap: () {
        widget.amountController.text = amount.toStringAsFixed(0);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.accentBlue.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.2)),
        ),
        child: Text(
          '$label · ₱${NumberFormat('#,##0').format(amount)}',
          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accentBlue),
        ),
      ),
    );
  }
}


// ══════════════════════════════════════════════════════════════
// Edit Customer Screen (full-page editor pushed from app bar)
// ══════════════════════════════════════════════════════════════
class _EditCustomerScreen extends StatefulWidget {
  final UserProfile customer;
  const _EditCustomerScreen({required this.customer});

  @override
  State<_EditCustomerScreen> createState() => _EditCustomerScreenState();
}

class _EditCustomerScreenState extends State<_EditCustomerScreen> {
  bool _isSaving = false;

  late final TextEditingController _firstNameCtrl;
  late final TextEditingController _middleNameCtrl;
  late final TextEditingController _lastNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _facebookUrlCtrl;
  late final TextEditingController _pppoeUserCtrl;
  late final TextEditingController _pppoePassCtrl;
  late final TextEditingController _wifiNameCtrl;
  late final TextEditingController _wifiPassCtrl;
  late final TextEditingController _napboxCtrl;
  late final TextEditingController _wifiPortCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _barangayCtrl;
  late final TextEditingController _cityCtrl;
  late final TextEditingController _provinceCtrl;

  List<String> _existingImages = [];
  List<Uint8List> _newImageBytesList = [];
  List<String> _newImageNamesList = [];
  LatLng? _editingLocation;

  @override
  void initState() {
    super.initState();
    final c = widget.customer;
    _firstNameCtrl = TextEditingController(text: c.firstName);
    _middleNameCtrl = TextEditingController(text: c.middleName);
    _lastNameCtrl = TextEditingController(text: c.lastName);
    _phoneCtrl = TextEditingController(text: c.phone);
    _facebookUrlCtrl = TextEditingController(text: c.facebookUrl ?? '');
    _pppoeUserCtrl = TextEditingController(text: c.pppoeUser ?? '');
    _pppoePassCtrl = TextEditingController(text: c.pppoePassword ?? '');
    _wifiNameCtrl = TextEditingController(text: c.wifiName ?? '');
    _wifiPassCtrl = TextEditingController(text: c.wifiPassword ?? '');
    _napboxCtrl = TextEditingController(text: c.napbox ?? '');
    _wifiPortCtrl = TextEditingController(text: c.wifiPort ?? '');
    _addressCtrl = TextEditingController(text: c.address);
    _barangayCtrl = TextEditingController(text: c.barangay);
    _cityCtrl = TextEditingController(text: c.city);
    _provinceCtrl = TextEditingController(text: c.province);

    // Load existing images
    final imageStr = c.profileImage?.trim() ?? '';
    try {
      if (imageStr.startsWith('[')) {
        final List<dynamic> decoded = jsonDecode(imageStr);
        for (var item in decoded) {
          if (item != null && item.toString().isNotEmpty) {
            _existingImages.add(item.toString());
          }
        }
      } else if (imageStr.isNotEmpty) {
        _existingImages.add(imageStr);
      }
    } catch (_) {
      if (imageStr.isNotEmpty) _existingImages.add(imageStr);
    }

    if (c.latitude != null && c.longitude != null) {
      _editingLocation = LatLng(c.latitude!, c.longitude!);
    }
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _middleNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _facebookUrlCtrl.dispose();
    _pppoeUserCtrl.dispose();
    _pppoePassCtrl.dispose();
    _wifiNameCtrl.dispose();
    _wifiPassCtrl.dispose();
    _napboxCtrl.dispose();
    _wifiPortCtrl.dispose();
    _addressCtrl.dispose();
    _barangayCtrl.dispose();
    _cityCtrl.dispose();
    _provinceCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickLocation() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPicker(
          initialLocation: _editingLocation ?? const LatLng(14.5995, 120.9842),
        ),
      ),
    );
    if (result != null && result is LatLng) {
      setState(() => _editingLocation = result);
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFiles = await picker.pickMultiImage(
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 80,
    );
    if (pickedFiles.isNotEmpty) {
      List<Uint8List> bytesList = [];
      List<String> namesList = [];
      for (var file in pickedFiles) {
        bytesList.add(await file.readAsBytes());
        namesList.add(file.name);
      }
      setState(() {
        _newImageBytesList.addAll(bytesList);
        _newImageNamesList.addAll(namesList);
      });
    }
  }

  Future<List<String>> _uploadImages() async {
    List<String> uploadedUrls = [];
    if (_newImageBytesList.isEmpty) return uploadedUrls;
    final storage = Storage(AppwriteService().client);
    for (int i = 0; i < _newImageBytesList.length; i++) {
      final bytes = _newImageBytesList[i];
      final name = _newImageNamesList[i];
      try {
        final file = await storage.createFile(
          bucketId: 'customer_images',
          fileId: ID.unique(),
          file: InputFile.fromBytes(bytes: bytes, filename: name),
        );
        uploadedUrls.add('$appwriteEndpoint/storage/buckets/customer_images/files/${file.$id}/view?project=$appwriteProjectId');
      } catch (e) {
        debugPrint('Image upload error: $e');
      }
    }
    return uploadedUrls;
  }

  Future<void> _saveChanges() async {
    setState(() => _isSaving = true);
    try {

      final Map<String, dynamic> updates = {
        'firstName': _firstNameCtrl.text.trim(),
        'middleName': _middleNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'facebookUrl': _facebookUrlCtrl.text.trim(),
        'pppoeUser': _pppoeUserCtrl.text.trim(),
        'pppoePassword': _pppoePassCtrl.text.trim(),
        'wifiName': _wifiNameCtrl.text.trim(),
        'wifiPassword': _wifiPassCtrl.text.trim(),
        'napbox': _napboxCtrl.text.trim(),
        'wifiPort': _wifiPortCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'barangay': _barangayCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'province': _provinceCtrl.text.trim(),
      };

      if (_editingLocation != null) {
        updates['latitude'] = _editingLocation!.latitude;
        updates['longitude'] = _editingLocation!.longitude;
      }

      List<String> finalImages = List.from(_existingImages);
      if (_newImageBytesList.isNotEmpty) {
        final newlyUploaded = await _uploadImages();
        finalImages.addAll(newlyUploaded);
      }

      if (finalImages.isNotEmpty) {
        if (finalImages.length == 1) {
          updates['profileImage'] = finalImages.first;
        } else {
          updates['profileImage'] = jsonEncode(finalImages);
        }
      } else {
        updates['profileImage'] = '';
      }

      await AppwriteService().tablesDB.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.usersProfile,
        rowId: widget.customer.id,
        data: updates,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Customer updated'), backgroundColor: AppTheme.accentEmerald),
        );
        Navigator.of(context).pop(true); // Return true to signal update
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update: $e'), backgroundColor: AppTheme.accentRose),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text('Edit Customer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18)),
        backgroundColor: AppTheme.bgDark,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        actions: [
          _isSaving
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : TextButton.icon(
                  onPressed: _saveChanges,
                  icon: const Icon(Icons.check, size: 18),
                  label: Text('Save', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                  style: TextButton.styleFrom(foregroundColor: AppTheme.accentEmerald),
                ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Personal Info
            _buildSection('Personal Information', Icons.person_outline, [
              _editField('First Name', _firstNameCtrl),
              _editField('Middle Name', _middleNameCtrl),
              _editField('Last Name', _lastNameCtrl),
              _editField('Phone', _phoneCtrl, keyboardType: TextInputType.phone),
            ]),
            const SizedBox(height: 16),

            // Credentials
            _buildSection('Credentials & WiFi', Icons.lock_outline, [
              _editField('Facebook URL', _facebookUrlCtrl),
              _editField('PPPoE Account', _pppoeUserCtrl),
              _editField('PPPoE Password', _pppoePassCtrl),
              _editField('WiFi Name', _wifiNameCtrl),
              _editField('WiFi Password', _wifiPassCtrl),
            ]),
            const SizedBox(height: 16),

            // Facility
            _buildSection('Facility', Icons.router_outlined, [
              _editField('Napbox', _napboxCtrl),
              _editField('Port', _wifiPortCtrl),
            ]),
            const SizedBox(height: 16),

            // Address
            _buildSection('Address', Icons.location_on_outlined, [
              _editField('Street', _addressCtrl),
              _editField('Barangay', _barangayCtrl),
              _editField('City', _cityCtrl),
              _editField('Province', _provinceCtrl),
              const SizedBox(height: 12),
              // Photos
              _buildPhotoEditor(),
              const SizedBox(height: 12),
              // Map
              _buildMapEditor(),
            ]),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, IconData icon, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppTheme.textPrimary),
              const SizedBox(width: 8),
              Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _editField(String label, TextEditingController controller, {TextInputType? keyboardType}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
          const SizedBox(height: 4),
          TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              filled: true,
              fillColor: AppTheme.bgDark.withValues(alpha: 0.5),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.accentBlue)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoEditor() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Location Photos', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (int i = 0; i < _existingImages.length; i++)
                Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0, 2))],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            _existingImages[i].startsWith('http') ? _existingImages[i] : '$appwriteEndpoint/storage/buckets/customer_images/files/${_existingImages[i]}/view?project=$appwriteProjectId',
                            width: 80, height: 80, fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      Positioned(
                        top: -4, right: -4,
                        child: GestureDetector(
                          onTap: () => setState(() => _existingImages.removeAt(i)),
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(color: AppTheme.accentRose, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                            child: const Icon(Icons.close, color: Colors.white, size: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              for (int i = 0; i < _newImageBytesList.length; i++)
                Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0, 2))],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.memory(_newImageBytesList[i], width: 80, height: 80, fit: BoxFit.cover),
                        ),
                      ),
                      Positioned(
                        top: -4, right: -4,
                        child: GestureDetector(
                          onTap: () => setState(() { _newImageBytesList.removeAt(i); _newImageNamesList.removeAt(i); }),
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(color: AppTheme.accentRose, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                            child: const Icon(Icons.close, color: Colors.white, size: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.bgDark.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
                  ),
                  child: const Center(
                    child: Icon(Icons.add_photo_alternate_outlined, size: 28, color: AppTheme.accentBlue),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMapEditor() {
    final hasLoc = _editingLocation != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Location Pin', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
        const SizedBox(height: 8),
        Container(
          height: 140,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
            color: AppTheme.bgDark.withValues(alpha: 0.5),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              if (hasLoc)
                FlutterMap(
                  options: MapOptions(
                    initialCenter: _editingLocation!,
                    initialZoom: 16.0,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.springhive.wifibilling.collector',
                      tileProvider: NetworkTileProvider(headers: const {'User-Agent': 'WiFiBillingApp/1.0.0 (admin@springhive.com)'}),
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _editingLocation!,
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_on, color: AppTheme.accentBlue, size: 32),
                        ),
                      ],
                    ),
                  ],
                )
              else
                const Center(child: Text('No location pinned', style: TextStyle(color: AppTheme.textMuted))),
              Positioned(
                bottom: 10, right: 10,
                child: ElevatedButton.icon(
                  onPressed: _pickLocation,
                  icon: const Icon(Icons.pin_drop_outlined, size: 14),
                  label: Text(hasLoc ? 'Change' : 'Pin Location', style: const TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accentBlue,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(0, 36),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 4,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
