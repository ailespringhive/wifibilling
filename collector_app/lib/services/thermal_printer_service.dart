import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:permission_handler/permission_handler.dart';

/// Service to manage Bluetooth thermal printer (GOOJPRT PT-210, 58mm)
class ThermalPrinterService {
  static final ThermalPrinterService _instance = ThermalPrinterService._();
  factory ThermalPrinterService() => _instance;
  ThermalPrinterService._();

  bool _isConnected = false;
  String? _connectedName;

  bool get isConnected => _isConnected;
  String? get connectedName => _connectedName;

  /// Request required Bluetooth permissions for modern Android (12+)
  Future<bool> _requestPermissions() async {
    if (kIsWeb) return false;
    Map<Permission, PermissionStatus> statuses = await [
      Permission.bluetooth,
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.location,
    ].request();

    bool allGranted = true;
    for (var status in statuses.values) {
      if (status.isDenied || status.isPermanentlyDenied) {
        allGranted = false;
      }
    }
    return allGranted;
  }

  /// Check if Bluetooth is available and turned on
  Future<bool> isBluetoothEnabled() async {
    if (kIsWeb) return false;
    try {
      await _requestPermissions(); // Ensure permissions before checking capabilities
      return await PrintBluetoothThermal.bluetoothEnabled;
    } catch (_) {
      return false;
    }
  }

  /// Get list of paired Bluetooth devices
  Future<List<BluetoothInfo>> getPairedDevices() async {
    if (kIsWeb) return [];
    try {
      final permitted = await _requestPermissions();
      if (!permitted) return [];
      return await PrintBluetoothThermal.pairedBluetooths;
    } catch (_) {
      return [];
    }
  }

  /// Connect to a printer by MAC address
  Future<bool> connect(String mac, String name) async {
    if (kIsWeb) return false;
    try {
      final result = await PrintBluetoothThermal.connect(macPrinterAddress: mac);
      _isConnected = result;
      if (result) {
        _connectedName = name;
      }
      return result;
    } catch (_) {
      _isConnected = false;
      return false;
    }
  }

  /// Disconnect from the current printer
  Future<void> disconnect() async {
    if (kIsWeb) return;
    try {
      await PrintBluetoothThermal.disconnect;
    } catch (_) {}
    _isConnected = false;
    _connectedName = null;
  }

  /// Check current connection status
  Future<bool> checkConnection() async {
    if (kIsWeb) return false;
    try {
      _isConnected = await PrintBluetoothThermal.connectionStatus;
      if (!_isConnected) {
        _connectedName = null;
      }
      return _isConnected;
    } catch (_) {
      _isConnected = false;
      return false;
    }
  }

  /// Print a WiFi billing receipt on the GOOJPRT PT-210 (58mm / 384 dots)
  Future<String?> printReceipt({
    required String invoiceNo,
    required String receiptDate,
    required String customerName,
    required String phone,
    required String address,
    required String billingPeriod,
    required double planRate,
    required double amountPaid,
    required double balance,
    required String status,
    String? collectorName,
  }) async {
    if (kIsWeb) return "Web printing not supported via Bluetooth.";

    final connected = await checkConnection();
    if (!connected) return "Printer disconnected. Please reconnect.";

    try {
      final profile = await CapabilityProfile.load();
      final generator = Generator(PaperSize.mm58, profile);
      List<int> bytes = [];

      bytes += generator.reset();

      // ── Header ──
      bytes += generator.text(
        'WiFi Billing',
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
        ),
      );
      bytes += generator.text(
        'Internet Service Provider',
        styles: const PosStyles(align: PosAlign.center),
        linesAfter: 0,
      );
      bytes += generator.hr(ch: '-');

      // ── Receipt info ──
      bytes += generator.row([
        PosColumn(text: 'Receipt #', width: 5, styles: const PosStyles()),
        PosColumn(text: invoiceNo, width: 7, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      bytes += generator.row([
        PosColumn(text: 'Date', width: 5, styles: const PosStyles()),
        PosColumn(text: receiptDate, width: 7, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      bytes += generator.hr(ch: '-');

      // ── Customer info ──
      bytes += generator.row([
        PosColumn(text: 'Customer', width: 4, styles: const PosStyles()),
        PosColumn(text: customerName, width: 8, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      if (phone.isNotEmpty) {
        bytes += generator.row([
          PosColumn(text: 'Phone', width: 4, styles: const PosStyles()),
          PosColumn(text: phone, width: 8, styles: const PosStyles(align: PosAlign.right, bold: true)),
        ]);
      }
      if (address.isNotEmpty) {
        bytes += generator.row([
          PosColumn(text: 'Address', width: 4, styles: const PosStyles()),
          PosColumn(text: address, width: 8, styles: const PosStyles(align: PosAlign.right, bold: true)),
        ]);
      }
      bytes += generator.hr(ch: '-');

      // ── Billing details ──
      bytes += generator.row([
        PosColumn(text: 'Period', width: 5, styles: const PosStyles()),
        PosColumn(text: billingPeriod, width: 7, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      bytes += generator.row([
        PosColumn(text: 'Plan Rate', width: 5, styles: const PosStyles()),
        PosColumn(text: 'P${planRate.toStringAsFixed(2)}', width: 7, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      bytes += generator.hr(ch: '-');

      // ── Amount Paid (large) ──
      bytes += generator.text(
        'AMOUNT PAID',
        styles: const PosStyles(align: PosAlign.center),
      );
      bytes += generator.text(
        'P${amountPaid.toStringAsFixed(2)}',
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
        ),
      );
      bytes += generator.hr(ch: '-');

      // ── Status ──
      bytes += generator.row([
        PosColumn(text: 'Status', width: 5, styles: const PosStyles()),
        PosColumn(text: status, width: 7, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      if (collectorName != null && collectorName.isNotEmpty) {
        bytes += generator.row([
          PosColumn(text: 'Collected', width: 5, styles: const PosStyles()),
          PosColumn(text: collectorName, width: 7, styles: const PosStyles(align: PosAlign.right, bold: true)),
        ]);
      }
      bytes += generator.row([
        PosColumn(text: 'Balance', width: 5, styles: const PosStyles()),
        PosColumn(text: 'P${balance.toStringAsFixed(2)}', width: 7, styles: const PosStyles(align: PosAlign.right, bold: true)),
      ]);
      bytes += generator.hr(ch: '-');

      // ── Footer ──
      bytes += generator.text(
        'Thank you for your payment!',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
      bytes += generator.text(
        'Keep this receipt for your records.',
        styles: const PosStyles(align: PosAlign.center),
      );
      bytes += generator.emptyLines(1);

      if (status == 'PAID') {
        bytes += generator.text(
          '** P A I D **',
          styles: const PosStyles(
            align: PosAlign.center,
            bold: true,
            height: PosTextSize.size2,
            width: PosTextSize.size2,
          ),
        );
        bytes += generator.emptyLines(1);
      }

      try {
        bytes += generator.barcode(Barcode.code128(invoiceNo.codeUnits));
      } catch (e) {
        bytes += generator.text(
          invoiceNo,
          styles: const PosStyles(align: PosAlign.center),
          linesAfter: 0,
        );
      }

      // Feed paper so receipt can be torn off
      bytes += generator.feed(3);

      final result = await PrintBluetoothThermal.writeBytes(bytes);
      return result ? null : "writeBytes returned false. Printer might have rejected the byte data.";
    } catch (e) {
      // ignore: avoid_print
      print('Thermal print error: $e');
      return e.toString();
    }
  }
}
