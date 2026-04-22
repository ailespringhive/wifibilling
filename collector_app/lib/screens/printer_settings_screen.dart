import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/thermal_printer_service.dart';
import '../services/local_cache_service.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  final ThermalPrinterService _printer = ThermalPrinterService();
  final LocalCacheService _cache = LocalCacheService();

  bool _isScanning = false;
  bool _isConnecting = false;
  List<BluetoothInfo> _pairedDevices = [];
  String? _savedMac;
  String? _savedName;

  bool _printingTest = false;

  @override
  void initState() {
    super.initState();
    _loadSavedPrinter();
    if (!kIsWeb) {
      _scanDevices();
    }
  }

  Future<void> _loadSavedPrinter() async {
    final mac = _cache.getSetting('default_printer_mac');
    final name = _cache.getSetting('default_printer_name');
    if (mounted) {
      setState(() {
        _savedMac = mac;
        _savedName = name;
      });
    }
  }

  Future<void> _scanDevices() async {
    setState(() => _isScanning = true);
    final btEnabled = await _printer.isBluetoothEnabled();
    if (!btEnabled) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please turn on Bluetooth first'), backgroundColor: Colors.orange),
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

  Future<void> _setAsDefault(String mac, String name) async {
    await _cache.saveSetting('default_printer_mac', mac);
    await _cache.saveSetting('default_printer_name', name);
    setState(() {
      _savedMac = mac;
      _savedName = name;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$name set as default printer'), backgroundColor: AppTheme.accentBlue),
    );
  }

  Future<void> _testPrint(String mac, String name) async {
    setState(() => _isConnecting = true);
    // Connect first
    final conn = await _printer.connect(mac, name);
    if (!conn) {
      setState(() => _isConnecting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to connect to $name'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() {
      _isConnecting = false;
      _printingTest = true;
    });

    final err = await _printer.printReceipt(
      invoiceNo: 'TEST-12345',
      receiptDate: 'TEST DATE',
      customerName: 'J. Dela Cruz',
      phone: '0900000000',
      address: 'Test Address',
      billingPeriod: 'January 2099',
      planRate: 999,
      amountPaid: 999,
      balance: 0,
      status: 'PAID',
    );

    setState(() => _printingTest = false);
    
    if (err == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Test receipt printed successfully!'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Test print failed: $err'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return Scaffold(
        appBar: AppBar(title: const Text('Printer Settings')),
        body: const Center(child: Text('Bluetooth printing is not supported on the web.')),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Text('Bluetooth Printer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18)),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Saved Default Printer', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: _savedMac != null ? AppTheme.accentBlue.withValues(alpha: 0.1) : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.print,
                      color: _savedMac != null ? AppTheme.accentBlue : Colors.grey.shade400,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _savedName ?? 'No Printer Selected',
                          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        ),
                        Text(
                          _savedMac ?? 'Tap a device below to set as default',
                          style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 30),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Paired Devices', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
                if (_isScanning)
                  const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                else
                  InkWell(
                    onTap: _scanDevices,
                    child: Text('Refresh', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.accentBlue)),
                  ),
              ],
            ),
            const SizedBox(height: 10),

            if (_pairedDevices.isEmpty && !_isScanning)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(30),
                  child: Text(
                    'No paired devices found.\nPlease pair your Bluetooth printer in Android Settings first.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(color: AppTheme.textMuted),
                  ),
                ),
              ),

            ..._pairedDevices.map((device) {
              final isDefault = device.macAdress == _savedMac;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: isDefault ? AppTheme.accentBlue.withValues(alpha: 0.05) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDefault ? AppTheme.accentBlue.withValues(alpha: 0.3) : AppTheme.border),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: const Icon(Icons.bluetooth),
                  iconColor: isDefault ? AppTheme.accentBlue : AppTheme.textSecondary,
                  title: Text(device.name, style: GoogleFonts.inter(fontWeight: isDefault ? FontWeight.w700 : FontWeight.w600, fontSize: 15)),
                  subtitle: Text(device.macAdress, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted)),
                  trailing: PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'default') {
                        _setAsDefault(device.macAdress, device.name);
                      } else if (value == 'test') {
                        _testPrint(device.macAdress, device.name);
                      }
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'default',
                        child: Text(isDefault ? 'Saved as Default' : 'Set as Default', style: GoogleFonts.inter(fontWeight: isDefault ? FontWeight.w700 : FontWeight.w500)),
                      ),
                      const PopupMenuItem(
                        value: 'test',
                        child: Text('Print Test Receipt'),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
