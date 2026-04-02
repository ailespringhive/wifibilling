import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/billing.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';

class ReceiptPreviewScreen extends StatelessWidget {
  const ReceiptPreviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final args =
        ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final billing = args['billing'] as Billing;
    final customer = args['customer'] as UserProfile;
    final amountPaid = args['amountPaid'] as double;

    final receiptDate = billing.paidDate != null
        ? DateFormat('MMM dd, yyyy hh:mm a')
            .format(DateTime.parse(billing.paidDate!))
        : DateFormat('MMM dd, yyyy hh:mm a').format(DateTime.now());

    final invoiceNo = _generateInvoiceNo(billing);
    final billingPeriod = _billingPeriodLabel(billing.billingMonth);

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text('Receipt Preview',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        backgroundColor: AppTheme.bgDark,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // Receipt card — 58mm width simulation
          Expanded(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Container(
                  // 58mm ≈ 219px at 96 dpi, but for mobile preview we use a comfortable width
                  width: 280,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Company header
                        Text(
                          'WiFi Billing',
                          style: GoogleFonts.courierPrime(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.black,
                          ),
                        ),
                        Text(
                          'Internet Service Provider',
                          style: GoogleFonts.courierPrime(
                            fontSize: 10,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Official Receipt',
                          style: GoogleFonts.courierPrime(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Dashed divider
                        _dashedDivider(),
                        const SizedBox(height: 8),

                        // Receipt meta
                        _receiptRow('Receipt #', invoiceNo),
                        const SizedBox(height: 4),
                        _receiptRow('Date', receiptDate),
                        const SizedBox(height: 8),

                        _dashedDivider(),
                        const SizedBox(height: 8),

                        // Customer info
                        _receiptRow('Customer',
                            '${customer.firstName} ${customer.lastName}'),
                        const SizedBox(height: 4),
                        if (customer.phone.isNotEmpty) ...[
                          _receiptRow('Phone', customer.phone),
                          const SizedBox(height: 4),
                        ],
                        _receiptRow(
                            'Address',
                            [
                              customer.address,
                              customer.barangay,
                              customer.city
                            ].where((s) => s.isNotEmpty).join(', ')),
                        const SizedBox(height: 8),

                        _dashedDivider(),
                        const SizedBox(height: 8),

                        // Billing details
                        _receiptRow('Period', billingPeriod),
                        const SizedBox(height: 4),
                        _receiptRow('Plan Rate',
                            '₱${NumberFormat('#,##0.00').format(billing.amount)}'),
                        const SizedBox(height: 8),

                        _dashedDivider(),
                        const SizedBox(height: 10),

                        // Amount paid — prominent
                        Text(
                          'AMOUNT PAID',
                          style: GoogleFonts.courierPrime(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey[600],
                            letterSpacing: 1.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₱${NumberFormat('#,##0.00').format(amountPaid)}',
                          style: GoogleFonts.courierPrime(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(height: 10),

                        _dashedDivider(),
                        const SizedBox(height: 8),

                        // Payment status
                        _receiptRow(
                            'Status',
                            billing.isPaid
                                ? 'PAID'
                                : billing.paymentStatus.toUpperCase()),
                        if (billing.collectedBy != null &&
                            billing.collectedBy!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          _receiptRow('Collected By', billing.collectedBy!),
                        ],
                        const SizedBox(height: 12),

                        _dashedDivider(),
                        const SizedBox(height: 12),

                        // Footer
                        Text(
                          'Thank you for your payment!',
                          style: GoogleFonts.courierPrime(
                            fontSize: 10,
                            color: Colors.grey[700],
                            fontWeight: FontWeight.w700,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Keep this receipt for your records.',
                          style: GoogleFonts.courierPrime(
                            fontSize: 9,
                            color: Colors.grey[500],
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),

                        // Barcode-style decoration
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            20,
                            (i) => Container(
                              width: i % 3 == 0 ? 3 : 2,
                              height: 20,
                              margin: const EdgeInsets.only(right: 2),
                              color: i % 3 == 0
                                  ? Colors.black
                                  : Colors.grey[300],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),

                        Text(
                          invoiceNo,
                          style: GoogleFonts.courierPrime(
                            fontSize: 9,
                            color: Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Bottom action bar
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              border: const Border(
                top: BorderSide(color: AppTheme.border),
              ),
            ),
            child: Row(
              children: [
                // Close button
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon:
                          const Icon(Icons.arrow_back_outlined, size: 18),
                      label: Text('Back',
                          style: GoogleFonts.inter(
                              fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.textSecondary,
                        side: const BorderSide(color: AppTheme.border),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Print button (placeholder — will implement actual printing later)
                Expanded(
                  flex: 2,
                  child: SizedBox(
                    height: 52,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.accentBlue, Color(0xFF3B82F6)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color:
                                AppTheme.accentBlue.withValues(alpha: 0.25),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Printing will be configured in next update.',
                                style: GoogleFonts.inter(),
                              ),
                              backgroundColor: AppTheme.accentBlue,
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                          );
                        },
                        icon: const Icon(Icons.print_outlined, size: 20),
                        label: Text('Print Receipt',
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
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _receiptRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 80,
          child: Text(
            label,
            style: GoogleFonts.courierPrime(
              fontSize: 10,
              color: Colors.grey[600],
            ),
          ),
        ),
        const Text(': ', style: TextStyle(fontSize: 10, color: Colors.black)),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.courierPrime(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Colors.black,
            ),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

  Widget _dashedDivider() {
    return Row(
      children: List.generate(
        35,
        (i) => Expanded(
          child: Container(
            height: 1,
            color: i % 2 == 0 ? Colors.grey[400] : Colors.transparent,
          ),
        ),
      ),
    );
  }

  String _generateInvoiceNo(Billing billing) {
    final id = billing.id;
    final date = billing.dueDate != null
        ? DateTime.parse(billing.dueDate!)
        : DateTime.now();
    final y = date.year.toString().substring(2);
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    final suffix =
        id.replaceAll(RegExp(r'[^0-9]'), '').substring(0, 4.clamp(0, id.replaceAll(RegExp(r'[^0-9]'), '').length));
    return 'RCP-$y$m$d-${suffix.padLeft(4, '0')}';
  }

  String _billingPeriodLabel(String month) {
    if (month.isEmpty) return '—';
    final parts = month.split('-');
    if (parts.length < 2) return month;
    final date = DateTime(int.parse(parts[0]), int.parse(parts[1]));
    return DateFormat('MMMM yyyy').format(date);
  }
}
