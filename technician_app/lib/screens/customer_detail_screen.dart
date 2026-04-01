import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../services/auth_service.dart';
import '../models/user_profile.dart';
import '../theme/app_theme.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class CustomerDetailScreen extends StatefulWidget {
  const CustomerDetailScreen({super.key});

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  bool _isLoading = true;

  UserProfile? _customer;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      final args = ModalRoute.of(context)!.settings.arguments;
      if (args is UserProfile) {
        _customer = args;
        setState(() => _isLoading = false);
      } else if (args is String) {
        // Received a customer ID string — fetch the profile
        _loadCustomerById(args);
      }
    }
  }

  Future<void> _loadCustomerById(String customerId) async {
    setState(() => _isLoading = true);
    try {
      final databases = AppwriteService().databases;
      // Try fetching by document ID first
      try {
        final doc = await databases.getDocument(
          databaseId: appwriteDatabaseId,
          collectionId: AppCollections.usersProfile,
          documentId: customerId,
        );
        _customer = UserProfile.fromJson(doc.data);
      } catch (_) {
        // If not found by doc ID, search by userId field
        final response = await databases.listDocuments(
          databaseId: appwriteDatabaseId,
          collectionId: AppCollections.usersProfile,
          queries: [Query.equal('userId', customerId), Query.limit(1)],
        );
        if (response.documents.isNotEmpty) {
          _customer = UserProfile.fromJson(response.documents.first.data);
        }
      }
      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
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

  @override
  Widget build(BuildContext context) {
    if (_customer == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text('Customer Details',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        backgroundColor: AppTheme.bgDark,
        surfaceTintColor: Colors.transparent,
      ),
      body: RefreshIndicator(
        color: AppTheme.accentBlue,
        backgroundColor: AppTheme.bgCard,
        onRefresh: () async {
          if (_customer != null) {
            await _loadCustomerById(_customer!.userId);
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Customer Header Card ──
              _buildHeaderCard(),
              const SizedBox(height: 16),

              // ── Personal Info Card ──
              _buildPersonalInfoCard(),
              const SizedBox(height: 12),

              // ── Address Card ──
              _buildAddressCard(),
              const SizedBox(height: 16),

              // ── Location Map ──
              if (_customer!.latitude != null && _customer!.longitude != null) ...[
                _buildMapCard(),
                const SizedBox(height: 20),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ── Customer Header Card (avatar + name + meta) ──
  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.glassCard(radius: 20),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: AppTheme.avatarGradient(_customer!.firstName),
              borderRadius: BorderRadius.circular(16),
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
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Name + meta
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_customer!.firstName} ${_customer!.middleName} ${_customer!.lastName}'.trim(),
                  style: GoogleFonts.inter(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 12,
                  runSpacing: 4,
                  children: [
                    if (_customer!.phone.isNotEmpty)
                      _metaChip(Icons.phone_outlined, _customer!.phone),
                    if (_customer!.createdAt != null)
                      _metaChip(Icons.calendar_today_outlined,
                          'Since ${_formatDate(_customer!.createdAt)}'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _metaChip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppTheme.textMuted),
        const SizedBox(width: 4),
        Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 11,
            color: AppTheme.textMuted,
          ),
        ),
      ],
    );
  }

  // ── Personal Information Card ──
  Widget _buildPersonalInfoCard() {
    return Container(
      decoration: AppTheme.glassCard(radius: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                const Icon(Icons.person_outline, size: 18, color: AppTheme.accentBlue),
                const SizedBox(width: 8),
                Text(
                  'Personal Information',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _divider(),

          // Info rows
          _infoRow('Full Name', '${_customer!.firstName} ${_customer!.middleName} ${_customer!.lastName}'.trim()),
          _divider(),
          _infoRow('Phone', _customer!.phone.isNotEmpty ? _customer!.phone : '—'),
          _divider(),
          _infoRow('Customer ID', _customer!.userId.isNotEmpty ? _customer!.userId : '—', mono: true),
          _divider(),
          _infoRow('Registered', _formatDate(_customer!.createdAt)),
        ],
      ),
    );
  }

  // ── Address Card ──
  Widget _buildAddressCard() {
    return Container(
      decoration: AppTheme.glassCard(radius: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 18, color: AppTheme.accentBlue),
                const SizedBox(width: 8),
                Text(
                  'Address',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _divider(),

          _infoRow('Street', _customer!.address.isNotEmpty ? _customer!.address : '—'),
          _divider(),
          _infoRow('Barangay', _customer!.barangay.isNotEmpty ? _customer!.barangay : '—'),
          _divider(),
          _infoRow('City / Municipality', _customer!.city.isNotEmpty ? _customer!.city : '—'),
          _divider(),
          _infoRow('Province', _customer!.province.isNotEmpty ? _customer!.province : '—'),
        ],
      ),
    );
  }

  // ── Location Map Card ──
  Widget _buildMapCard() {
    final lat = _customer!.latitude!;
    final lng = _customer!.longitude!;
    return Container(
      height: 220,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: LatLng(lat, lng),
              initialZoom: 16.0,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.springhive.wifibilling.technician',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(lat, lng),
                    width: 40,
                    height: 40,
                    child: const Icon(
                      Icons.location_on,
                      color: AppTheme.accentRose,
                      size: 40,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            top: 10,
            right: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: AppTheme.glassCard(radius: 8).copyWith(
                color: AppTheme.bgDark.withValues(alpha: 0.85),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.gps_fixed, size: 14, color: AppTheme.accentBlue),
                  const SizedBox(width: 6),
                  Text(
                    '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider() {
    return Container(
      height: 1,
      color: AppTheme.border.withValues(alpha: 0.5),
    );
  }

  Widget _infoRow(String label, String value, {bool mono = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppTheme.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 16),
          Flexible(
            child: Text(
              value,
              style: mono
                  ? TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                      fontFamily: 'monospace',
                    )
                  : GoogleFonts.inter(
                      fontSize: 13,
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
