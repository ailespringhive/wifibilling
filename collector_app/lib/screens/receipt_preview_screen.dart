import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/rendering.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:ui' as ui;
import 'dart:typed_data';
import '../utils/print_helper.dart'
    if (dart.library.html) '../utils/print_helper_web.dart';
import '../models/billing.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';
import '../services/thermal_printer_service.dart';
import '../services/local_cache_service.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

class ReceiptPreviewScreen extends StatefulWidget {
  const ReceiptPreviewScreen({super.key});

  @override
  State<ReceiptPreviewScreen> createState() => _ReceiptPreviewScreenState();
}

class _ReceiptPreviewScreenState extends State<ReceiptPreviewScreen> {
  final ThermalPrinterService _printer = ThermalPrinterService();
  final GlobalKey _receiptKey = GlobalKey();

  bool _isPrinting = false;
  bool _isSharing = false;
  bool _isScanning = false;
  bool _isConnecting = false;
  List<BluetoothInfo> _pairedDevices = [];
  String? _selectedMac;


  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      _checkPrinterStatus();
    }
  }

  Future<void> _checkPrinterStatus() async {
    final connected = await _printer.checkConnection();
    if (mounted) setState(() {});
    if (!connected) {
      _scanDevices();
    }
  }

  Future<void> _scanDevices() async {
    setState(() => _isScanning = true);
    final btEnabled = await _printer.isBluetoothEnabled();
    if (!btEnabled) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please turn on Bluetooth first'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      setState(() => _isScanning = false);
      return;
    }

    final devices = await _printer.getPairedDevices();
    if (mounted) {
      setState(() {
        _pairedDevices = devices;
        _isScanning = false;
      });
    }
  }

  Future<void> _connectToPrinter(String mac, String name) async {
    setState(() => _isConnecting = true);
    final result = await _printer.connect(mac, name);
    if (mounted) {
      setState(() => _isConnecting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result ? '✅ Connected to $name' : '❌ Failed to connect to $name'),
          backgroundColor: result ? const Color(0xFF059669) : const Color(0xFFDC2626),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final args =
        ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final billing = args['billing'] as Billing;
    final customer = args['customer'] as UserProfile;
    final amountPaid = args['amountPaid'] as double;
    final String? collectorName = args['collectorName'] as String?;

    final parsedPaidDate = billing.paidDate != null ? DateTime.tryParse(billing.paidDate!) : null;
    final receiptDate = parsedPaidDate != null
        ? DateFormat('MMM dd, yyyy hh:mm a').format(parsedPaidDate.toLocal())
        : DateFormat('MMM dd, yyyy hh:mm a').format(DateTime.now());

    final invoiceNo = _generateInvoiceNo(billing);
    final billingPeriod = _billingPeriodLabel(billing.billingMonth);
    final double balance = (billing.amount - (billing.amountPaid ?? amountPaid)).clamp(0.0, double.infinity);

    int advanceMonths = 0;
    if (amountPaid > billing.amount && billing.amount > 0) {
      advanceMonths = ((amountPaid - billing.amount) / billing.amount).floor();
    }

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
                child: RepaintBoundary(
                  key: _receiptKey,
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
                        if (advanceMonths > 0) ...[
                          const SizedBox(height: 4),
                          _receiptRow('Advance For', '$advanceMonths month(s)'),
                        ],
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
                                : 'PARTIAL PAYMENT'),
                        if (collectorName != null && collectorName.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          _receiptRow('Collected By', collectorName),
                        ] else if (billing.collectedBy != null &&
                            billing.collectedBy!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          _receiptRow('Collected By', billing.collectedBy!),
                        ],
                        const SizedBox(height: 4),
                        _receiptRow(
                            'Balance',
                            '₱${NumberFormat('#,##0.00').format(balance)}'),
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

                        // Barcode-style decoration & PAID Stamp Overlay
                        Stack(
                          alignment: Alignment.center,
                          clipBehavior: Clip.none,
                          children: [
                            Column(
                              children: [
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
                            Positioned(
                              top: -160,
                              child: Transform.rotate(
                                  angle: -0.2, // angled stamp
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                    decoration: BoxDecoration(
                                      border: Border.all(color: Colors.red.withValues(alpha: 0.7), width: 3),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'PAID',
                                      style: TextStyle(
                                        fontFamily: 'Courier',
                                        fontSize: 32,
                                        height: 1.0,
                                        fontWeight: FontWeight.w900,
                                        color: Color.fromRGBO(255, 0, 0, 0.7),
                                        letterSpacing: 4,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],       // Column children
                    ),         // Column
                  ),           // Padding
                ),             // Container
              ),               // RepaintBoundary
              ),               // SingleChildScrollView
            ),                 // Center
          ),                   // Expanded

          // ── Bluetooth Printer Panel (mobile only) ──
          if (!kIsWeb) _buildBluetoothPanel(),

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
                // Back button
                SizedBox(
                  width: 52,
                  height: 52,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.textSecondary,
                      side: const BorderSide(color: AppTheme.border),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      padding: EdgeInsets.zero,
                    ),
                    child: const Icon(Icons.arrow_back_outlined, size: 20),
                  ),
                ),
                const SizedBox(width: 8),
                // Share button
                SizedBox(
                  width: 52,
                  height: 52,
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF8B5CF6),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: IconButton(
                      onPressed: _isSharing
                          ? null
                          : () => _shareReceipt(
                                customer,
                                billing,
                                amountPaid,
                                invoiceNo,
                              ),
                      icon: _isSharing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.share_outlined,
                              color: Colors.white, size: 22),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Print button
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: kIsWeb
                              ? [AppTheme.accentBlue, const Color(0xFF3B82F6)]
                              : _printer.isConnected
                                  ? [AppTheme.accentBlue, const Color(0xFF3B82F6)]
                                  : [Colors.grey.shade400, Colors.grey.shade500],
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
                        onPressed: _isPrinting
                            ? null
                            : () async {
                              if (kIsWeb) {
                                  _printReceiptWeb(customer, billing, amountPaid, balance, invoiceNo, receiptDate, billingPeriod, collectorName);
                                } else {
                                  await _printReceiptBluetooth(customer, billing, amountPaid, balance, invoiceNo, receiptDate, billingPeriod, collectorName);
                                }
                              },
                        icon: _isPrinting
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Icon(kIsWeb ? Icons.print_outlined : Icons.bluetooth_outlined, size: 20),
                        label: Text(
                            _isPrinting
                                ? 'Printing...'
                                : kIsWeb
                                    ? 'Print Receipt'
                                    : _printer.isConnected
                                        ? 'Print via BT'
                                        : 'Connect Printer',
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600, fontSize: 13)),
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

  // ── Share Receipt as Image ──
  Future<void> _shareReceipt(
    UserProfile customer,
    Billing billing,
    double amountPaid,
    String invoiceNo,
  ) async {
    setState(() => _isSharing = true);

    try {
      final boundary = _receiptKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) {
        throw Exception('Could not capture receipt');
      }

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        throw Exception('Could not convert receipt to image');
      }

      final Uint8List pngBytes = byteData.buffer.asUint8List();
      final String fileName = 'receipt_${invoiceNo.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}.png';

      await Share.shareXFiles(
        [
          XFile.fromData(
            pngBytes,
            mimeType: 'image/png',
            name: fileName,
          )
        ],
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share: $e'),
            backgroundColor: AppTheme.accentRose,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  // ── Bluetooth Printer Connection Panel ──
  Widget _buildBluetoothPanel() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: _printer.isConnected
                      ? const Color(0xFF059669).withValues(alpha: 0.1)
                      : const Color(0xFF2563EB).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _printer.isConnected ? Icons.bluetooth_connected : Icons.bluetooth,
                  size: 18,
                  color: _printer.isConnected
                      ? const Color(0xFF059669)
                      : const Color(0xFF2563EB),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _printer.isConnected
                          ? 'Connected: ${_printer.connectedName}'
                          : 'Bluetooth Printer',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    Text(
                      _printer.isConnected
                          ? 'GOOJPRT PT-210 ready'
                          : 'Select your paired printer',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: AppTheme.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              // Refresh button
              if (!_printer.isConnected)
                SizedBox(
                  width: 32,
                  height: 32,
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: _isScanning
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh, size: 18),
                    onPressed: _isScanning ? null : _scanDevices,
                    color: AppTheme.textMuted,
                  ),
                ),
              // Disconnect button
              if (_printer.isConnected)
                SizedBox(
                  height: 28,
                  child: TextButton(
                    onPressed: () async {
                      await _printer.disconnect();
                      if (mounted) setState(() {});
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      foregroundColor: const Color(0xFFDC2626),
                    ),
                    child: Text('Disconnect', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600)),
                  ),
                ),
            ],
          ),

          // ── Device list (when not connected) ──
          if (!_printer.isConnected && _pairedDevices.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              constraints: const BoxConstraints(maxHeight: 120),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _pairedDevices.length,
                separatorBuilder: (_, __) => const Divider(height: 1, color: AppTheme.border),
                itemBuilder: (_, i) {
                  final device = _pairedDevices[i];
                  final isSelected = _selectedMac == device.macAdress;
                  return InkWell(
                    onTap: _isConnecting
                        ? null
                        : () async {
                            setState(() {
                              _selectedMac = device.macAdress;
                            });
                            await _connectToPrinter(device.macAdress, device.name);
                          },
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      child: Row(
                        children: [
                          Icon(
                            Icons.print_outlined,
                            size: 16,
                            color: isSelected ? AppTheme.accentBlue : AppTheme.textMuted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  device.name,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Text(
                                  device.macAdress,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: AppTheme.textMuted,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_isConnecting && _selectedMac == device.macAdress)
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          else
                            Icon(
                              Icons.chevron_right,
                              size: 18,
                              color: AppTheme.textMuted,
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],

          // ── No devices message ──
          if (!_printer.isConnected && _pairedDevices.isEmpty && !_isScanning)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'No paired devices found.\nPair your GOOJPRT PT-210 in phone Settings → Bluetooth first.',
                style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
    );
  }

  // ── Bluetooth Print ──
  Future<void> _printReceiptBluetooth(
    UserProfile customer,
    Billing billing,
    double amountPaid,
    double balance,
    String invoiceNo,
    String receiptDate,
    String billingPeriod,
    String? collectorName,
  ) async {
    if (!_printer.isConnected) {
      final mac = LocalCacheService().getSetting('default_printer_mac');
      final name = LocalCacheService().getSetting('default_printer_name');
      if (mac != null && name != null) {
        setState(() => _isPrinting = true);
        final conn = await _printer.connect(mac, name);
        if (!conn) {
          setState(() => _isPrinting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to auto-connect to $name'), backgroundColor: Colors.red),
          );
          return;
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please select a printer or connect to one first.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
    }

    setState(() => _isPrinting = true);

    final address = [customer.address, customer.barangay, customer.city]
        .where((s) => s.isNotEmpty)
        .join(', ');
    final status = billing.isPaid ? 'PAID' : 'PARTIAL PAYMENT';

    final errorMessage = await _printer.printReceipt(
      invoiceNo: invoiceNo,
      receiptDate: receiptDate,
      customerName: '${customer.firstName} ${customer.lastName}',
      phone: customer.phone,
      address: address,
      billingPeriod: billingPeriod,
      planRate: billing.amount,
      amountPaid: amountPaid,
      balance: balance,
      status: status,
      collectorName: collectorName,
    );

    if (mounted) {
      setState(() => _isPrinting = false);
      final bool success = errorMessage == null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? '✅ Receipt printed successfully!' : '❌ $errorMessage'),
          backgroundColor: success ? const Color(0xFF059669) : const Color(0xFFDC2626),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  // ── Web Print Fallback ──
  static void _printReceiptWeb(UserProfile customer, Billing billing, double amountPaid, double balance, String invoiceNo, String receiptDate, String billingPeriod, String? collectorName) {
    final address = [customer.address, customer.barangay, customer.city]
        .where((s) => s.isNotEmpty)
        .join(', ');
    final status = billing.isPaid ? 'PAID' : 'PARTIAL PAYMENT';

    final receiptHtml = '''
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt</title>
<style>
  @page { margin: 0; size: 58mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 58mm; margin: 0 auto; padding: 4mm; font-size: 9px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .title { font-size: 14px; font-weight: bold; }
  .subtitle { font-size: 8px; color: #666; }
  .divider { border-top: 1px dashed #aaa; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .row .label { color: #666; }
  .row .value { font-weight: bold; text-align: right; }
  .amount { font-size: 18px; font-weight: bold; text-align: center; margin: 6px 0; }
  .amount-label { font-size: 8px; color: #666; text-align: center; letter-spacing: 1.5px; }
  .footer { font-size: 8px; color: #666; text-align: center; margin-top: 8px; }
</style>
</head>
<body>
  <div class="center">
    <div class="title">WiFi Billing</div>
    <div class="subtitle">Internet Service Provider</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="label">Receipt #</span><span class="value">$invoiceNo</span></div>
  <div class="row"><span class="label">Date</span><span class="value">$receiptDate</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Customer</span><span class="value">${customer.fullName}</span></div>
  ${customer.phone.isNotEmpty ? '<div class="row"><span class="label">Phone</span><span class="value">${customer.phone}</span></div>' : ''}
  <div class="row"><span class="label">Address</span><span class="value">$address</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Period</span><span class="value">$billingPeriod</span></div>
  <div class="row"><span class="label">Plan Rate</span><span class="value">₱${NumberFormat('#,##0.00').format(billing.amount)}</span></div>
  ${amountPaid > billing.amount && billing.amount > 0 ? '<div class="row"><span class="label">Advance For</span><span class="value">${((amountPaid - billing.amount) / billing.amount).floor()} month(s)</span></div>' : ''}
  <div class="divider"></div>
  <div class="amount-label">AMOUNT PAID</div>
  <div class="amount">₱${NumberFormat('#,##0.00').format(amountPaid)}</div>
  <div class="divider"></div>
  <div class="row"><span class="label">Status</span><span class="value">$status</span></div>
  ${collectorName != null && collectorName.isNotEmpty ? '<div class="row"><span class="label">Collected By</span><span class="value">$collectorName</span></div>' : (billing.collectedBy != null && billing.collectedBy!.isNotEmpty ? '<div class="row"><span class="label">Collected By</span><span class="value">${billing.collectedBy}</span></div>' : '')}
  <div class="row"><span class="label">Balance</span><span class="value">₱${NumberFormat('#,##0.00').format(balance)}</span></div>
  <div class="divider"></div>
  <div class="footer">
    <div class="bold">Thank you for your payment!</div>
    <div>Keep this receipt for your records.</div>
  </div>
</body>
</html>
''';

    printReceiptHtml(receiptHtml);
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
    final parsedDueDate = billing.dueDate != null ? DateTime.tryParse(billing.dueDate!) : null;
    final date = parsedDueDate ?? DateTime.now();
    final y = date.year.toString().substring(2);
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    final suffix =
        id.replaceAll(RegExp(r'[^0-9]'), '').substring(0, 4.clamp(0, id.replaceAll(RegExp(r'[^0-9]'), '').length));
    return 'RCP-$y$m$d-${suffix.padLeft(4, '0')}';
  }

  String _billingPeriodLabel(String month) {
    if (month.isEmpty) return '—';
    // Handle "MMMM yyyy" format (e.g. "April 2026")
    if (month.contains(' ') && !month.contains('-')) {
      return month; // Already in readable format
    }
    // Handle "yyyy-MM" format
    final parts = month.split('-');
    if (parts.length < 2) return month;
    try {
      final date = DateTime(int.parse(parts[0]), int.parse(parts[1]));
      return DateFormat('MMMM yyyy').format(date);
    } catch (_) {
      return month;
    }
  }
}
