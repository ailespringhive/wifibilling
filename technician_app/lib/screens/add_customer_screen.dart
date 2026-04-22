import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:appwrite/appwrite.dart';
import 'package:image_picker/image_picker.dart';
import '../config/appwrite_config.dart';
import '../widgets/location_picker.dart';
import '../theme/app_theme.dart';
import '../widgets/pop_in_bounce.dart';
import 'package:hugeicons/hugeicons.dart';

class AddCustomerScreen extends StatefulWidget {
  const AddCustomerScreen({super.key});

  @override
  State<AddCustomerScreen> createState() => _AddCustomerScreenState();
}

class _AddCustomerScreenState extends State<AddCustomerScreen> {
  final _formKey = GlobalKey<FormState>();

  final _firstNameCtrl = TextEditingController();
  final _middleNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _barangayCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _provinceCtrl = TextEditingController();
  final _wifiPortCtrl = TextEditingController();
  
  final _facebookUrlCtrl = TextEditingController();
  final _pppoeUserCtrl = TextEditingController();
  final _pppoePassCtrl = TextEditingController();
  final _wifiNameCtrl = TextEditingController();
  final _wifiPassCtrl = TextEditingController();
  final _napboxCtrl = TextEditingController();
  String? _billingStartDate;

  String? _selectedPlanId;
  String? _selectedWifiType;

  List<Map<String, dynamic>> _plans = [];

  LatLng? _selectedLocation;
  bool _isLoading = false;
  bool _isLoadingData = true;

  // Image state
  List<Uint8List> _imageBytesList = [];
  List<String> _imageNamesList = [];

  @override
  void initState() {
    super.initState();
    _fetchDropdownData();
  }

  Future<void> _fetchDropdownData() async {
    try {
      final databases = AppwriteService().databases;
      final plansRes = await databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.wifiPlans,
        queries: [Query.equal('isActive', true)],
      );

      if (mounted) {
        setState(() {
          _plans = plansRes.documents.map((d) => d.data..[r'$id'] = d.$id).toList();
          _isLoadingData = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching dropdowns: $e');
      if (mounted) setState(() => _isLoadingData = false);
    }
  }

  void _pickLocation() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPicker(
          initialLocation: _selectedLocation ?? const LatLng(14.5995, 120.9842),
        ),
      ),
    );

    if (result != null && result is LatLng) {
      setState(() {
        _selectedLocation = result;
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
        _imageBytesList.addAll(bytesList);
        _imageNamesList.addAll(namesList);
      });
    }
  }

  void _removeImage(int index) {
    setState(() {
      _imageBytesList.removeAt(index);
      _imageNamesList.removeAt(index);
    });
  }

  Future<List<String>> _uploadImages() async {
    List<String> uploadedUrls = [];
    if (_imageBytesList.isEmpty) return uploadedUrls;

    final storage = Storage(AppwriteService().client);

    for (int i = 0; i < _imageBytesList.length; i++) {
        final bytes = _imageBytesList[i];
        final name = _imageNamesList[i];
        try {
          final file = await storage.createFile(
            bucketId: 'customer_images',
            fileId: ID.unique(),
            file: InputFile.fromBytes(
              bytes: bytes,
              filename: name,
            ),
          );
          uploadedUrls.add('$appwriteEndpoint/storage/buckets/customer_images/files/${file.$id}/view?project=$appwriteProjectId');
        } catch (e) {
          debugPrint('Image $i upload error: $e');
          try {
            final uri = Uri.parse('$appwriteEndpoint/storage/buckets/customer_images/files');
            final request = http.MultipartRequest('POST', uri);
            request.headers['X-Appwrite-Project'] = appwriteProjectId;
            request.headers['X-Appwrite-Key'] = appwriteApiKey;
            request.fields['fileId'] = ID.unique();
            request.files.add(http.MultipartFile.fromBytes(
              'file',
              bytes,
              filename: name,
            ));
            final response = await request.send();
            if (response.statusCode == 201) {
              final body = await response.stream.bytesToString();
              final json = jsonDecode(body);
              final fileId = json[r'$id'];
              uploadedUrls.add('$appwriteEndpoint/storage/buckets/customer_images/files/$fileId/view?project=$appwriteProjectId');
            }
          } catch (e2) {
            debugPrint('HTTP $i upload fallback error: $e2');
          }
        }
    }
    return uploadedUrls;
  }

  Future<void> _saveCustomer() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please pin the customer location first'), backgroundColor: Colors.red));
      return;
    }
    if (_selectedPlanId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a WiFi Plan'), backgroundColor: Colors.red));
      return;
    }

    setState(() => _isLoading = true);

    try {
      List<String> imageUrls = [];
      if (_imageBytesList.isNotEmpty) {
        imageUrls = await _uploadImages();
      }

      final userId = 'cust_${DateTime.now().millisecondsSinceEpoch}';
      
      // We automatically assign a strong default password to bypass UI password entry
      const defaultPassword = 'P@ssw0rd123!';

      final emailInputValue = _emailCtrl.text.trim().toLowerCase();
      final validEmail = emailInputValue.isEmpty ? '$userId@temp.local' : emailInputValue;

      // 1. Create Appwrite User Account via Server API
      final createAccountRes = await http.post(
        Uri.parse('$appwriteEndpoint/users'),
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
        },
        body: jsonEncode({
          'userId': userId,
          'email': validEmail,
          'password': defaultPassword,
          'name': '${_firstNameCtrl.text.trim()} ${_lastNameCtrl.text.trim()}',
        }),
      );

      if (createAccountRes.statusCode != 201) {
        throw Exception('Failed to create account: ${createAccountRes.body}');
      }

      // 2. Grant Permissions
      await http.patch(
        Uri.parse('$appwriteEndpoint/users/$userId/prefs'),
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
        },
        body: jsonEncode({
          'prefs': {}
        }),
      );

      // 3. Create Profile Document
      final databases = AppwriteService().databases;
      final profileData = {
        'userId': userId,
        'firstName': _firstNameCtrl.text.trim(),
        'middleName': _middleNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'email': validEmail,
        'phone': _phoneCtrl.text.trim(),
        'facebookUrl': _facebookUrlCtrl.text.trim(),
        'pppoeUser': _pppoeUserCtrl.text.trim(),
        'pppoePassword': _pppoePassCtrl.text.trim(),
        'wifiName': _wifiNameCtrl.text.trim(),
        'wifiPassword': _wifiPassCtrl.text.trim(),
        'billingStartDate': _billingStartDate ?? DateTime.now().toIso8601String(),
        'napbox': _napboxCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'barangay': _barangayCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'province': _provinceCtrl.text.trim(),
        'role': 'customer',
        'latitude': _selectedLocation!.latitude,
        'longitude': _selectedLocation!.longitude,
        'planId': _selectedPlanId,
        'wifiPort': _wifiPortCtrl.text.trim(),
        'wifiType': _selectedWifiType,
      };

      if (imageUrls.isNotEmpty) {
        if (imageUrls.length == 1) {
          profileData['profileImage'] = imageUrls.first;
        } else {
          profileData['profileImage'] = jsonEncode(imageUrls);
        }
      }

      await databases.createDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.usersProfile,
        documentId: ID.unique(),
        data: profileData,
      );

      // 4. Create Subscription Document
      final subscriptionData = {
        'customerId': userId,
        'planId': _selectedPlanId,
        'collectorId': '',
        'status': 'active',
        'startDate': _billingStartDate ?? DateTime.now().toIso8601String(),
      };

      await databases.createDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.subscriptions,
        documentId: ID.unique(),
        data: subscriptionData,
      );

      // 5. Create First Billing Record
      try {
        double planRate = 0;
        final selectedPlan = _plans.cast<Map<String, dynamic>>().firstWhere(
          (p) => (p[r'$id'] ?? p['id']).toString() == _selectedPlanId,
          orElse: () => {'monthlyRate': 0},
        );
        planRate = double.tryParse(selectedPlan['monthlyRate'].toString()) ?? 0;

        final billDate = DateTime.parse(_billingStartDate ?? DateTime.now().toIso8601String());
        final billingMonth = '${billDate.year}-${billDate.month.toString().padLeft(2, '0')}';
        final dueDate = DateTime(billDate.year, billDate.month + 1, billDate.day);

        await databases.createDocument(
          databaseId: appwriteDatabaseId,
          collectionId: AppCollections.billings,
          documentId: ID.unique(),
          data: {
            'customerId': userId,
            'customerName': '${_firstNameCtrl.text.trim()} ${_lastNameCtrl.text.trim()}',
            'subscriptionId': '',
            'billingMonth': billingMonth,
            'amount': planRate,
            'dueDate': dueDate.toIso8601String(),
            'paymentStatus': 'not_yet_paid',
            'notes': '',
          },
        );
      } catch (e) {
        debugPrint('Warning: First billing record creation failed: $e');
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer added successfully!'), backgroundColor: Colors.green));
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingData) {
      return const Scaffold(
        backgroundColor: AppTheme.bgDark,
        body: Center(child: CircularProgressIndicator(color: AppTheme.accentBlue)),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text('Add New Customer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18, color: AppTheme.textPrimary)),
        backgroundColor: AppTheme.bgCard,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. PERSONAL INFORMATION CARD
              PopInBounce(
                delay: const Duration(milliseconds: 100),
                child: _buildCardSection(
                title: 'Personal Information',
                icon: HugeIcons.strokeRoundedUser,
                children: [
                  _buildLabel('Customer ID'),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppTheme.bgDark.withValues(alpha: 0.5),
                      border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('CUST-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}', style: GoogleFonts.inter(color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _buildLabelTextField(_firstNameCtrl, 'First Name *', required: true)),
                      const SizedBox(width: 12),
                      Expanded(child: _buildLabelTextField(_middleNameCtrl, 'Middle Name')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildLabelTextField(_lastNameCtrl, 'Last Name *', required: true),
                ]
              )),

              // 2. SUBSCRIPTION DETAILS CARD
              PopInBounce(
                delay: const Duration(milliseconds: 150),
                child: _buildCardSection(
                title: 'Subscription Details',
                icon: HugeIcons.strokeRoundedWifi01,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                       Expanded(child: _buildLabelTextField(_phoneCtrl, 'Phone Number *', keyboardType: TextInputType.phone, required: true)),
                       const SizedBox(width: 12),
                       Expanded(
                         child: Column(
                           crossAxisAlignment: CrossAxisAlignment.start,
                           children: [
                             _buildLabel('WiFi Plan *'),
                             _buildDropdownField(
                               value: _selectedPlanId,
                               hint: 'Select a plan',
                               items: _plans.map<DropdownMenuItem<String>>((p) => DropdownMenuItem<String>(
                                 value: (p[r'$id'] ?? p['id']).toString(),
                                 child: Text('${p['name']} — ₱${p['monthlyRate']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
                               )).toList(),
                               onChanged: (val) => setState(() => _selectedPlanId = val),
                               validator: (val) => val == null ? 'Required' : null,
                             ),
                           ],
                         ),
                       ),
                    ],
                  ),
                ]
              )),

              // 2.5 CREDENTIALS & BILLING CARD
              PopInBounce(
                delay: const Duration(milliseconds: 175),
                child: _buildCardSection(
                title: 'Credentials & Billing',
                icon: HugeIcons.strokeRoundedLockKey,
                children: [
                   Row(
                     crossAxisAlignment: CrossAxisAlignment.start,
                     children: [
                       Expanded(child: _buildLabelTextField(_facebookUrlCtrl, 'Facebook URL')),
                       const SizedBox(width: 12),
                       Expanded(
                         child: Column(
                           crossAxisAlignment: CrossAxisAlignment.start,
                           children: [
                             _buildLabel('Billing Date *'),
                             GestureDetector(
                               onTap: () async {
                                 final dt = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime(2100));
                                 if (dt != null) setState(() => _billingStartDate = dt.toIso8601String());
                               },
                               child: Container(
                                 width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                 decoration: BoxDecoration(color: AppTheme.bgDark.withValues(alpha: 0.5), border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)), borderRadius: BorderRadius.circular(12)),
                                 child: Text(_billingStartDate != null ? DateFormat('MMM dd, yyyy').format(DateTime.parse(_billingStartDate!)) : 'Select Date', style: TextStyle(color: _billingStartDate != null ? AppTheme.textPrimary : AppTheme.textMuted, fontSize: 13)),
                               ),
                             ),
                           ],
                         ),
                       ),
                     ],
                   ),
                   const SizedBox(height: 16),
                   Row(
                     crossAxisAlignment: CrossAxisAlignment.start,
                     children: [
                       Expanded(child: _buildLabelTextField(_pppoeUserCtrl, 'PPPoE Account')),
                       const SizedBox(width: 12),
                       Expanded(child: _buildLabelTextField(_pppoePassCtrl, 'PPPoE Password')),
                     ],
                   ),
                   const SizedBox(height: 16),
                   Row(
                     crossAxisAlignment: CrossAxisAlignment.start,
                     children: [
                       Expanded(child: _buildLabelTextField(_wifiNameCtrl, 'WiFi Name')),
                       const SizedBox(width: 12),
                       Expanded(child: _buildLabelTextField(_wifiPassCtrl, 'WiFi Password')),
                     ],
                   ),
                ]
              )),

              // 3. WIFI FACILITIES CARD
              PopInBounce(
                delay: const Duration(milliseconds: 200),
                child: _buildCardSection(
                title: 'WiFi Facilities',
                icon: HugeIcons.strokeRoundedRouter01,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                           crossAxisAlignment: CrossAxisAlignment.start,
                           children: [
                             _buildLabel('Access Type'),
                             _buildDropdownField(
                               value: _selectedWifiType,
                               hint: 'Select type',
                               items: const [
                                 DropdownMenuItem(value: 'PPPoE', child: Text('PPPoE', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13))),
                                 DropdownMenuItem(value: 'Static/Dynamic IP', child: Text('Static IP', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13))),
                                 DropdownMenuItem(value: 'Voucher', child: Text('Voucher', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13))),
                                 DropdownMenuItem(value: 'P2P/Antenna', child: Text('P2P/Antenna', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13))),
                               ],
                               onChanged: (val) => setState(() => _selectedWifiType = val),
                             ),
                           ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildLabelTextField(_napboxCtrl, 'Napbox', hintText: 'e.g. NB-01'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildLabelTextField(_wifiPortCtrl, 'Router Port', hintText: 'e.g. Port 3'),
                      ),
                    ],
                  ),
                ]
              )),

              // 4. HOUSE LOCATION PHOTOS CARD
              PopInBounce(
                delay: const Duration(milliseconds: 250),
                child: _buildCardSection(
                title: 'Location Photos',
                icon: HugeIcons.strokeRoundedCamera01,
                children: [
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (int i = 0; i < _imageBytesList.length; i++)
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
                                      _imageBytesList[i],
                                      width: 100,
                                      height: 100,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                                Positioned(
                                  top: -4,
                                  right: -4,
                                  child: GestureDetector(
                                    onTap: () => _removeImage(i),
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
                              border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.5), style: BorderStyle.none),
                            ),
                            child: CustomPaint(
                              painter: _DashedBorderPainter(),
                              child: const Center(
                                child: HugeIcon(icon: HugeIcons.strokeRoundedImageAdd01, color: AppTheme.accentBlue, size: 32.0),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('Upload clear photos of the house and equipment setup.', style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 12)),
                ]
              )),

              // 5. PIN LOCATION CARD
              PopInBounce(
                delay: const Duration(milliseconds: 300),
                child: _buildCardSection(
                title: 'Map Coordinates',
                icon: HugeIcons.strokeRoundedGps01,
                children: [
                  Container(
                    width: double.infinity,
                    height: 160,
                    decoration: BoxDecoration(
                      color: AppTheme.bgDark.withValues(alpha: 0.5),
                      border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: Stack(
                      children: [
                         _selectedLocation == null
                           ? const Center(child: Text('Map Placeholder', style: TextStyle(color: AppTheme.textMuted)))
                           : Image.network(
                               'https://static-maps.yandex.ru/1.x/?ll=${_selectedLocation!.longitude},${_selectedLocation!.latitude}&z=15&l=map&size=600,180&pt=${_selectedLocation!.longitude},${_selectedLocation!.latitude},pm2rdm',
                               width: double.infinity, height: double.infinity, fit: BoxFit.cover,
                               errorBuilder: (c,e,s) => Center(child: HugeIcon(icon: HugeIcons.strokeRoundedMapsLocation01, color: AppTheme.textMuted, size: 40.0)),
                             ),
                         Positioned(
                           bottom: 10, right: 10,
                           child: ElevatedButton.icon(
                             onPressed: _pickLocation,
                             icon: HugeIcon(icon: HugeIcons.strokeRoundedLocation04, color: Colors.white, size: 14.0),
                             label: Text(_selectedLocation == null ? 'Pin Location' : 'Change', style: const TextStyle(fontWeight: FontWeight.bold)),
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
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildLabel('Latitude'),
                            Container(
                              width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(color: AppTheme.bgDark.withValues(alpha: 0.5), border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)), borderRadius: BorderRadius.circular(12)),
                              child: Text(_selectedLocation?.latitude.toStringAsFixed(5) ?? '--', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildLabel('Longitude'),
                            Container(
                              width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(color: AppTheme.bgDark.withValues(alpha: 0.5), border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)), borderRadius: BorderRadius.circular(12)),
                              child: Text(_selectedLocation?.longitude.toStringAsFixed(5) ?? '--', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ]
              )),

              // 6. ADDRESS CARD
              PopInBounce(
                delay: const Duration(milliseconds: 350),
                child: _buildCardSection(
                title: 'Installation Address',
                icon: HugeIcons.strokeRoundedHouse01,
                children: [
                  _buildLabelTextField(_addressCtrl, 'Street Address *', required: true),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _buildLabelTextField(_barangayCtrl, 'Barangay *', required: true)),
                      const SizedBox(width: 12),
                      Expanded(child: _buildLabelTextField(_cityCtrl, 'City *', required: true)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildLabelTextField(_provinceCtrl, 'Province *', required: true),
                ]
              )),

              // SUBMIT ROW
              const SizedBox(height: 16),
              PopInBounce(
                delay: const Duration(milliseconds: 400),
                child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        side: const BorderSide(color: AppTheme.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Cancel', style: GoogleFonts.inter(fontSize: 15, color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 2,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.accentBlue,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [BoxShadow(color: AppTheme.accentBlue.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 4))]
                      ),
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _saveCustomer,
                        icon: _isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : HugeIcon(icon: HugeIcons.strokeRoundedUserAdd01, color: Colors.white, size: 20.0),
                        label: Text('Save Customer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ),
                ],
              )),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCardSection({required String title, required List<List<dynamic>> icon, required List<Widget> children}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
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
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accentBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: HugeIcon(icon: icon, color: AppTheme.accentBlue, size: 20.0),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          ...children,
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  Widget _buildDropdownField({
    required String? value, 
    required String hint, 
    required List<DropdownMenuItem<String>> items, 
    required void Function(String?) onChanged,
    String? Function(String?)? validator
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgDark.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
      ),
      child: DropdownButtonFormField<String>(
        value: value,
        isExpanded: true,
        icon: HugeIcon(icon: HugeIcons.strokeRoundedMore02, color: AppTheme.textSecondary, size: 20.0),
        dropdownColor: AppTheme.bgCard,
        style: const TextStyle(color: AppTheme.textPrimary),
        items: items,
        onChanged: onChanged,
        validator: validator,
        decoration: InputDecoration(
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          hintText: hint,
          isDense: true,
          hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
        ),
      ),
    );
  }

  Widget _buildLabelTextField(TextEditingController controller, String label, {String? hintText, TextInputType? keyboardType, bool required = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.bgDark.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
          ),
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 14),
            validator: required ? (v) => v!.isEmpty ? 'Required' : null : null,
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
              border: InputBorder.none,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = AppTheme.accentBlue.withValues(alpha: 0.5)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    
    const double dashWidth = 6;
    const double dashSpace = 6;
    
    // Top
    double startX = 0;
    while (startX < size.width) {
      canvas.drawLine(Offset(startX, 0), Offset(startX + dashWidth, 0), paint);
      startX += dashWidth + dashSpace;
    }
    // Bottom
    startX = 0;
    while (startX < size.width) {
      canvas.drawLine(Offset(startX, size.height), Offset(startX + dashWidth, size.height), paint);
      startX += dashWidth + dashSpace;
    }
    // Left
    double startY = 0;
    while (startY < size.height) {
      canvas.drawLine(Offset(0, startY), Offset(0, startY + dashWidth), paint);
      startY += dashWidth + dashSpace;
    }
    // Right
    startY = 0;
    while (startY < size.height) {
      canvas.drawLine(Offset(size.width, startY), Offset(size.width, startY + dashWidth), paint);
      startY += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
