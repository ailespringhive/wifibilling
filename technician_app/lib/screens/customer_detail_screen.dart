import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:intl/intl.dart';
import 'package:appwrite/appwrite.dart';
import 'package:image_picker/image_picker.dart';

import '../config/appwrite_config.dart';

import '../models/user_profile.dart';
import '../theme/app_theme.dart';
import '../widgets/location_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:hugeicons/hugeicons.dart';

class CustomerDetailScreen extends StatefulWidget {
  const CustomerDetailScreen({super.key});

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {

  bool _isEditing = false;
  bool _isSaving = false;

  UserProfile? _customer;
  bool _initialized = false;

  final _firstNameCtrl = TextEditingController();
  final _middleNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _facebookUrlCtrl = TextEditingController();
  final _pppoeUserCtrl = TextEditingController();
  final _pppoePassCtrl = TextEditingController();
  final _wifiNameCtrl = TextEditingController();
  final _wifiPassCtrl = TextEditingController();
  final _napboxCtrl = TextEditingController();
  final _wifiPortCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _barangayCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _provinceCtrl = TextEditingController();

  // Image editing state
  final List<String> _existingImages = [];
  final List<Uint8List> _newImageBytesList = [];
  final List<String> _newImageNamesList = [];

  // Location editing state
  LatLng? _editingLocation;

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
      setState(() {
        _editingLocation = result;
      });
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
    if (_customer == null) return;
    setState(() => _isSaving = true);
    try {
      final databases = AppwriteService().databases;
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

      final doc = await databases.updateDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.usersProfile,
        documentId: _customer!.id,
        data: updates,
      );

      final map = Map<String, dynamic>.from(doc.data as Map);
      map[r'$id'] = doc.$id;
      map[r'$createdAt'] = doc.$createdAt;
      _customer = UserProfile.fromJson(map);
      if (mounted) {
        setState(() => _isEditing = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer updated'), backgroundColor: AppTheme.accentBlue));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _enterEditMode() {
    if (_customer == null) return;
    _firstNameCtrl.text = _customer!.firstName;
    _middleNameCtrl.text = _customer!.middleName;
    _lastNameCtrl.text = _customer!.lastName;
    _phoneCtrl.text = _customer!.phone;
    _facebookUrlCtrl.text = _customer!.facebookUrl ?? '';
    _pppoeUserCtrl.text = _customer!.pppoeUser ?? '';
    _pppoePassCtrl.text = _customer!.pppoePassword ?? '';
    _wifiNameCtrl.text = _customer!.wifiName ?? '';
    _wifiPassCtrl.text = _customer!.wifiPassword ?? '';
    _napboxCtrl.text = _customer!.napbox ?? '';
    _wifiPortCtrl.text = _customer!.wifiPort ?? '';
    _addressCtrl.text = _customer!.address;
    _barangayCtrl.text = _customer!.barangay;
    _cityCtrl.text = _customer!.city;
    _provinceCtrl.text = _customer!.province;

    _existingImages.clear();
    _newImageBytesList.clear();
    _newImageNamesList.clear();
    final imageStr = _customer!.profileImage?.trim() ?? '';
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

    if (_customer!.latitude != null && _customer!.longitude != null) {
      _editingLocation = LatLng(_customer!.latitude!, _customer!.longitude!);
    } else {
      _editingLocation = null;
    }

    setState(() => _isEditing = true);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      final args = ModalRoute.of(context)!.settings.arguments;
      if (args is UserProfile) {
        _customer = args;
        setState(() {});  // refresh after data loaded
      } else if (args is String) {
        // Received a customer ID string — fetch the profile
        _loadCustomerById(args);
      }
    }
  }

  Future<void> _loadCustomerById(String customerId) async {
    // fetch start — _customer will be null so build() shows spinner
    try {
      final databases = AppwriteService().databases;
      // Try fetching by document ID first
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
        // If not found by doc ID, search by userId field
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
      setState(() {});  // trigger rebuild with fetched data
    } catch (e) {
      setState(() {});  // stop loading on error
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
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: Text('Customer Details', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black87)),
        backgroundColor: const Color(0xFFF3F4F6),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      body: RefreshIndicator(
        color: AppTheme.accentBlue,
        backgroundColor: Colors.white,
        onRefresh: () async {
          if (_customer != null) {
            await _loadCustomerById(_customer!.userId);
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Header Profile Card ──
              _buildHeaderCard(),
              const SizedBox(height: 16),

              // ── Personal Information Card ──
              _buildSectionCard(
                title: 'Personal Information',
                icon: HugeIcons.strokeRoundedUser,
                children: [
                  if (_isEditing) ...[
                    _infoRow('First Name', '', controller: _firstNameCtrl),
                    _divider(),
                    _infoRow('Middle Name', '', controller: _middleNameCtrl),
                    _divider(),
                    _infoRow('Last Name', '', controller: _lastNameCtrl),
                  ] else ...[
                    _infoRow('Full Name', '${_customer!.firstName} ${_customer!.middleName} ${_customer!.lastName}'.trim()),
                  ],
                  _divider(),
                  _infoRow('Phone', _customer!.phone.isNotEmpty ? _customer!.phone : '—', controller: _phoneCtrl),
                  _divider(),
                  _infoRow('Customer ID', _customer!.userId, mono: true),
                  _divider(),
                  _infoRow('Registered', _formatDate(_customer!.createdAt)),
                ]
              ),

              const SizedBox(height: 16),

              // ── Credentials & Billing Card ──
              _buildSectionCard(
                title: 'Credentials & Billing',
                icon: HugeIcons.strokeRoundedLockKey,
                children: [
                  _infoRow('Facebook Profile', _getDynamicField('facebookUrl', '—'), isLink: _getDynamicField('facebookUrl', '').startsWith('http'), controller: _facebookUrlCtrl),
                  _divider(),
                  _infoRow('PPPoE Account', _getDynamicField('pppoeUser', '—'), controller: _pppoeUserCtrl),
                  _divider(),
                  _infoRow('PPPoE Password', _getDynamicField('pppoePassword', '—'), mono: true, controller: _pppoePassCtrl),
                  _divider(),
                  _infoRow('WiFi Name', _getDynamicField('wifiName', '—'), controller: _wifiNameCtrl),
                  _divider(),
                  _infoRow('WiFi Password', _getDynamicField('wifiPassword', '—'), mono: true, controller: _wifiPassCtrl),
                  _divider(),
                  _infoRow('Billing Date', _getDynamicField('billingStartDate', '—')),
                ]
              ),

              const SizedBox(height: 16),

              // ── Facility Card ──
              _buildSectionCard(
                title: 'Facility',
                icon: HugeIcons.strokeRoundedRouter01,
                children: [
                  _infoRow('Napbox', _getDynamicField('napbox', '—'), controller: _napboxCtrl),
                  _divider(),
                  _infoRow('Port', _getDynamicField('wifiPort', '—'), controller: _wifiPortCtrl),
                ]
              ),

              const SizedBox(height: 16),

              // ── Address Card ──
              _buildSectionCard(
                title: 'Address',
                icon: HugeIcons.strokeRoundedLocation01,
                children: [
                  if (_isEditing) ...[
                    _infoRow('Street', '', controller: _addressCtrl),
                    _divider(),
                    _infoRow('Barangay', '', controller: _barangayCtrl),
                    _divider(),
                    _infoRow('City', '', controller: _cityCtrl),
                    _divider(),
                    _infoRow('Province', '', controller: _provinceCtrl),
                  ] else ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Street', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted, fontWeight: FontWeight.w500)),
                        Text('${_customer!.address}    ${_customer!.barangay}', textAlign: TextAlign.right, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                      ]
                    ),
                    _divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('City / Municipality', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted, fontWeight: FontWeight.w500)),
                        Text('${_customer!.city}    ${_customer!.province}', textAlign: TextAlign.right, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                      ]
                    ),
                  ],

                  if (_isEditing || (_customer!.profileImage != null && _customer!.profileImage!.isNotEmpty) || (_customer!.latitude != null && _customer!.longitude != null)) ...[
                    const SizedBox(height: 8),
                    if (_isEditing || (_customer!.profileImage != null && _customer!.profileImage!.isNotEmpty)) ...[
                       const SizedBox(height: 16),
                       _buildPhotoCarousel(),
                    ],
                    if (_isEditing || (_customer!.latitude != null && _customer!.longitude != null)) ...[
                       const SizedBox(height: 16),
                       _buildMapCard(),
                    ],
                  ],
                ]
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  String _getDynamicField(String key, String fallback) {
    try {
      // Basic generic extraction if UserProfile has a toJson map we could read
      final jsonMap = _customer!.toJson();
      final val = jsonMap[key];
      if (val != null && val.toString().isNotEmpty) return val.toString();
    } catch (_) {}
    return fallback;
  }

  Widget _buildSectionCard({required String title, required List<List<dynamic>> icon, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Text(
            title,
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade500),
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: children,
          ),
        ),
      ],
    );
  }

  // ── Customer Header Card (avatar + name + meta) ──
  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Avatar
          Container(
            width: 60,
            height: 60,
            decoration: const BoxDecoration(
              color: AppTheme.accentBlue,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _customer!.initials,
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),

          // Name + meta
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_customer!.firstName} ${_customer!.middleName} ${_customer!.lastName}'.trim(),
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 16,
                  runSpacing: 4,
                  children: [
                    if (_customer!.phone.isNotEmpty)
                      _metaChip(HugeIcons.strokeRoundedCall02, _customer!.phone),
                    if (_customer!.createdAt != null)
                      _metaChip(HugeIcons.strokeRoundedCalendar01,
                          'Since ${_formatDate(_customer!.createdAt)}'),
                  ],
                ),
              ],
            ),
          ),

          // Action Buttons
          if (_isEditing)
            Row(
              children: [
                IconButton(
                  onPressed: () => setState(() => _isEditing = false),
                  icon: HugeIcon(icon: HugeIcons.strokeRoundedCancel01, color: Colors.red, size: 22.0),
                  tooltip: 'Discard',
                ),
                _isSaving
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                    : IconButton(
                        onPressed: _saveChanges,
                        icon: HugeIcon(icon: HugeIcons.strokeRoundedTick02, color: Colors.green, size: 22.0),
                        tooltip: 'Save',
                      ),
              ],
            )
          else
            OutlinedButton.icon(
              onPressed: _enterEditMode,
              icon: HugeIcon(icon: HugeIcons.strokeRoundedEdit02, color: AppTheme.accentBlue, size: 16.0),
              label: const Text('Edit'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.accentBlue,
                side: const BorderSide(color: AppTheme.accentBlue),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                minimumSize: const Size(0, 32),
              ),
            ),
        ],
      ),
    );
  }

  Widget _metaChip(List<List<dynamic>> icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        HugeIcon(icon: icon, size: 14.0, color: AppTheme.textMuted),
        const SizedBox(width: 4),
        Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 12,
            color: AppTheme.textMuted,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  // ── Location Photos ──
  Widget _buildPhotoCarousel() {
    List<String> photos = [];
    final imageStr = _customer!.profileImage!.trim();

    try {
      if (imageStr.startsWith('[')) {
        final List<dynamic> decoded = jsonDecode(imageStr);
        for (var item in decoded) {
          if (item != null && item.toString().isNotEmpty) {
            photos.add(item.toString());
          }
        }
      } else {
        photos.add(imageStr);
      }
    } catch (_) {
      photos.add(imageStr);
    }

    if (photos.isEmpty && !_isEditing) return const SizedBox.shrink();

    final imageUrls = photos.map((p) {
      if (p.startsWith('http')) return p;
      return '$appwriteEndpoint/storage/buckets/customer_images/files/$p/view?project=$appwriteProjectId';
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('House Location Photo', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        if (!_isEditing)
          Container(
            height: 140,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: _PhotoCarouselWidget(imageUrls: imageUrls),
          )
        else
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (int i = 0; i < _existingImages.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Stack(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0,2))],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              _existingImages[i].startsWith('http') ? _existingImages[i] : '$appwriteEndpoint/storage/buckets/customer_images/files/${_existingImages[i]}/view?project=$appwriteProjectId',
                              width: 100, height: 100, fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        Positioned(
                          top: -4, right: -4,
                          child: GestureDetector(
                            onTap: () => setState(() => _existingImages.removeAt(i)),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(color: AppTheme.accentRose, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                              child: HugeIcon(icon: HugeIcons.strokeRoundedCancel01, color: Colors.white, size: 12.0),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                for (int i = 0; i < _newImageBytesList.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Stack(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0,2))],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.memory(
                              _newImageBytesList[i], width: 100, height: 100, fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        Positioned(
                          top: -4, right: -4,
                          child: GestureDetector(
                            onTap: () => setState(() { _newImageBytesList.removeAt(i); _newImageNamesList.removeAt(i); }),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(color: AppTheme.accentRose, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                              child: HugeIcon(icon: HugeIcons.strokeRoundedCancel01, color: Colors.white, size: 12.0),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                GestureDetector(
                  onTap: _pickImage,
                  child: Container(
                    width: 100, height: 100,
                    decoration: BoxDecoration(
                      color: AppTheme.bgDark.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: HugeIcon(icon: HugeIcons.strokeRoundedImageAdd01, color: AppTheme.accentBlue, size: 32.0),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  // ── Location Map Card ──
  Widget _buildMapCard() {
    final lat = _isEditing ? _editingLocation?.latitude : _customer!.latitude;
    final lng = _isEditing ? _editingLocation?.longitude : _customer!.longitude;
    final hasLoc = lat != null && lng != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Location Pin', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
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
                          child: HugeIcon(
                            icon: HugeIcons.strokeRoundedLocation01,
                            color: AppTheme.accentBlue,
                            size: 32.0,
                          ),
                        ),
                      ],
                    ),
                  ],
                )
              else
                const Center(child: Text('No location pinned', style: TextStyle(color: AppTheme.textMuted))),
              
              if (_isEditing)
                Positioned(
                  bottom: 10, right: 10,
                  child: ElevatedButton.icon(
                    onPressed: _pickLocation,
                    icon: HugeIcon(icon: HugeIcons.strokeRoundedLocation04, color: Colors.white, size: 14.0),
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
        )
      ]
    );
  }

  Widget _divider() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      height: 1,
      color: AppTheme.border.withValues(alpha: 0.5),
    );
  }

  Widget _infoRow(String label, String value, {bool mono = false, bool isLink = false, TextEditingController? controller}) {
    if (_isEditing && controller != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: 130,
              child: Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppTheme.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextFormField(
                controller: controller,
                style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide(color: AppTheme.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide(color: AppTheme.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: AppTheme.accentBlue)),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
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
                    fontWeight: isLink ? FontWeight.bold : FontWeight.w600,
                    color: isLink ? AppTheme.accentBlue : AppTheme.textPrimary,
                  ),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

}

class _PhotoCarouselWidget extends StatefulWidget {
  final List<String> imageUrls;
  const _PhotoCarouselWidget({required this.imageUrls});

  @override
  State<_PhotoCarouselWidget> createState() => _PhotoCarouselWidgetState();
}

class _PhotoCarouselWidgetState extends State<_PhotoCarouselWidget> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.imageUrls.isEmpty) return const SizedBox.shrink();

    return PageView.builder(
      controller: _pageController,
      itemCount: widget.imageUrls.length,
      onPageChanged: (index) {
        setState(() {
          _currentIndex = index;
        });
      },
      itemBuilder: (context, index) {
        return Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              widget.imageUrls[index],
              fit: BoxFit.cover,
              errorBuilder: (ctx, _, _) => const Center(
                child: HugeIcon(icon: HugeIcons.strokeRoundedImage01, color: AppTheme.textMuted, size: 32.0),
              ),
            ),
            if (widget.imageUrls.length > 1) ...[
              // Left Arrow
              Positioned(
                left: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: InkWell(
                    onTap: () {
                      if (_currentIndex > 0) {
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    },
                    child: CircleAvatar(
                      radius: 14,
                      backgroundColor: Colors.black.withValues(alpha: 0.5),
                      child: HugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01, color: Colors.white, size: 20.0),
                    ),
                  ),
                ),
              ),
              // Right Arrow
              Positioned(
                right: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: InkWell(
                    onTap: () {
                      if (_currentIndex < widget.imageUrls.length - 1) {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    },
                    child: CircleAvatar(
                      radius: 14,
                      backgroundColor: Colors.black.withValues(alpha: 0.5),
                      child: HugeIcon(icon: HugeIcons.strokeRoundedArrowRight01, color: Colors.white, size: 20.0),
                    ),
                  ),
                ),
              ),
              // Dots
              Positioned(
                bottom: 8,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    widget.imageUrls.length,
                    (idx) => AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: _currentIndex == idx ? 12 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: _currentIndex == idx ? Colors.white : Colors.white.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
              ),
            ]
          ],
        );
      },
    );
  }
}
