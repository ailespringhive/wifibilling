import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:appwrite/appwrite.dart';
import 'package:image_picker/image_picker.dart';
import '../config/appwrite_config.dart';
import '../widgets/location_picker.dart';

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

  String? _selectedPlanId;
  String? _selectedWifiType;

  List<Map<String, dynamic>> _plans = [];

  LatLng? _selectedLocation;
  bool _isLoading = false;
  bool _isLoadingData = true;

  // Image state
  Uint8List? _imageBytes;
  String? _imageName;

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
          _plans = plansRes.documents.map((d) => d.data..['\$id'] = d.$id).toList();
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
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 80,
    );

    if (picked != null) {
      final bytes = await picked.readAsBytes();
      setState(() {
        _imageBytes = bytes;
        _imageName = picked.name;
      });
    }
  }

  Future<String?> _uploadImage() async {
    if (_imageBytes == null) return null;

    try {
      final storage = Storage(AppwriteService().client);
      final file = await storage.createFile(
        bucketId: 'customer_images',
        fileId: ID.unique(),
        file: InputFile.fromBytes(
          bytes: _imageBytes!,
          filename: _imageName ?? 'customer_photo.jpg',
        ),
      );

      final fileUrl = '$appwriteEndpoint/storage/buckets/customer_images/files/${file.$id}/view?project=$appwriteProjectId';
      return fileUrl;
    } catch (e) {
      debugPrint('Image upload error: $e');
      try {
        final uri = Uri.parse('$appwriteEndpoint/storage/buckets/customer_images/files');
        final request = http.MultipartRequest('POST', uri);
        request.headers['X-Appwrite-Project'] = appwriteProjectId;
        request.headers['X-Appwrite-Key'] = appwriteApiKey;
        request.fields['fileId'] = ID.unique();
        request.files.add(http.MultipartFile.fromBytes(
          'file',
          _imageBytes!,
          filename: _imageName ?? 'customer_photo.jpg',
        ));
        final response = await request.send();
        if (response.statusCode == 201) {
          final body = await response.stream.bytesToString();
          final json = jsonDecode(body);
          final fileId = json[r'$id'];
          return '$appwriteEndpoint/storage/buckets/customer_images/files/$fileId/view?project=$appwriteProjectId';
        }
      } catch (e2) {
        debugPrint('HTTP upload fallback error: $e2');
      }
      return null;
    }
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
      String? imageUrl;
      if (_imageBytes != null) {
        imageUrl = await _uploadImage();
      }

      final userId = 'cust_${DateTime.now().millisecondsSinceEpoch}';
      
      // We automatically assign a strong default password to bypass UI password entry
      const defaultPassword = 'P@ssw0rd123!';

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
          'email': _emailCtrl.text.trim().toLowerCase(),
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
        'email': _emailCtrl.text.trim().toLowerCase(),
        'phone': _phoneCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'barangay': _barangayCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'province': _provinceCtrl.text.trim(),
        'role': 'customer',
        'latitude': _selectedLocation!.latitude,
        'longitude': _selectedLocation!.longitude,
        'wifiPort': _wifiPortCtrl.text.trim(),
        'wifiType': _selectedWifiType,
      };

      if (imageUrl != null) {
        profileData['profileImage'] = imageUrl;
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
        'startDate': DateTime.now().toIso8601String(),
      };

      await databases.createDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.subscriptions,
        documentId: ID.unique(),
        data: subscriptionData,
      );

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
        backgroundColor: Color(0xFF0F0F1A),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF388E3C))),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F0F1A),
      appBar: AppBar(
        title: Text('Add Customer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16)),
        backgroundColor: const Color(0xFF161622),
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. PERSONAL INFORMATION
              _buildSectionTitle('Personal Information'),
              const SizedBox(height: 16),
              _buildTextField(_firstNameCtrl, 'First Name *', Icons.person, required: true),
              const SizedBox(height: 12),
              _buildTextField(_middleNameCtrl, 'Middle Name', Icons.person_outline),
              const SizedBox(height: 12),
              _buildTextField(_lastNameCtrl, 'Last Name *', Icons.person, required: true),
              const SizedBox(height: 12),
              _buildTextField(_emailCtrl, 'Email Address *', Icons.email, keyboardType: TextInputType.emailAddress, required: true),
              const SizedBox(height: 12),
              
              _buildTextField(_addressCtrl, 'Street Address', Icons.home),
              const SizedBox(height: 12),
              _buildTextField(_barangayCtrl, 'Barangay', Icons.location_city),
              const SizedBox(height: 12),
              _buildTextField(_cityCtrl, 'City', Icons.business),
              const SizedBox(height: 12),
              _buildTextField(_provinceCtrl, 'Province', Icons.map),
              const SizedBox(height: 24),

              // 2. SUBSCRIPTION DETAILS
              _buildSectionTitle('Subscription Details'),
              const SizedBox(height: 16),
              _buildTextField(_phoneCtrl, 'Phone Number *', Icons.phone, keyboardType: TextInputType.phone, required: true),
              const SizedBox(height: 12),
              
              DropdownButtonFormField<String>(
                value: _selectedPlanId,
                icon: const Icon(Icons.arrow_drop_down, color: Colors.white54),
                decoration: _dropdownDecoration('WiFi Plan *', Icons.wifi),
                dropdownColor: const Color(0xFF161622),
                style: const TextStyle(color: Colors.white),
                items: _plans.map<DropdownMenuItem<String>>((p) => DropdownMenuItem<String>(
                  value: (p['\$id'] ?? p['id']).toString(),
                  child: Text('${p['name']} — ₱${p['monthlyRate']}'),
                )).toList(),
                onChanged: (val) => setState(() => _selectedPlanId = val),
                validator: (val) => val == null ? 'Required' : null,
              ),
              const SizedBox(height: 24),

              // 3. WIFI EQUIPMENT
              _buildSectionTitle('WiFi Equipment'),
              const SizedBox(height: 16),
              _buildTextField(_wifiPortCtrl, 'WiFi Port (e.g. Port 3, Slot 2)', Icons.router),
              const SizedBox(height: 12),
              
              DropdownButtonFormField<String>(
                value: _selectedWifiType,
                icon: const Icon(Icons.arrow_drop_down, color: Colors.white54),
                decoration: _dropdownDecoration('Select WiFi type', Icons.settings_ethernet),
                dropdownColor: const Color(0xFF161622),
                style: const TextStyle(color: Colors.white),
                items: const [
                  DropdownMenuItem(value: 'PPPoE', child: Text('PPPoE')),
                  DropdownMenuItem(value: 'Static/Dynamic IP', child: Text('Static/Dynamic IP')),
                  DropdownMenuItem(value: 'Voucher', child: Text('Voucher')),
                  DropdownMenuItem(value: 'P2P/Antenna', child: Text('P2P/Antenna')),
                ],
                onChanged: (val) => setState(() => _selectedWifiType = val),
              ),
              const SizedBox(height: 24),

              // 4. HOUSE LOCATION PHOTO
              _buildSectionTitle('House Location Photo'),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF161622),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _imageBytes != null ? const Color(0xFF388E3C).withValues(alpha: 0.5) : Colors.white12),
                  ),
                  child: _imageBytes != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.memory(_imageBytes!, height: 180, width: double.infinity, fit: BoxFit.cover),
                        )
                      : Column(
                          children: [
                            const Icon(Icons.camera_alt, size: 40, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text('Click to upload house location photo', style: GoogleFonts.inter(color: Colors.white54, fontSize: 13)),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 24),

              // 5. PIN LOCATION
              _buildSectionTitle('Pin Location'),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF161622),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _selectedLocation == null ? Colors.red.withValues(alpha: 0.5) : const Color(0xFF388E3C).withValues(alpha: 0.5)),
                ),
                child: Column(
                  children: [
                    Icon(Icons.location_on, size: 40, color: _selectedLocation == null ? Colors.grey : Colors.red),
                    const SizedBox(height: 12),
                    Text(
                      _selectedLocation == null ? 'No location selected' : '${_selectedLocation!.latitude.toStringAsFixed(4)}, ${_selectedLocation!.longitude.toStringAsFixed(4)}',
                      style: GoogleFonts.inter(color: Colors.white70, fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: _pickLocation,
                      icon: const Icon(Icons.map, size: 18),
                      label: Text(_selectedLocation == null ? 'Pin Location on Map' : 'Change Location'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3b82f6),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: const BorderSide(color: Colors.white24),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Cancel', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _saveCustomer,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: const Color(0xFF3b82f6),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _isLoading
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text('Save Customer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Row(
      children: [
        Icon(
          title.contains('Personal') ? Icons.person_outline :
          title.contains('Subscription') ? Icons.wifi :
          title.contains('Equipment') ? Icons.router :
          title.contains('Photo') ? Icons.camera_alt_outlined :
          Icons.my_location,
          color: const Color(0xFF3b82f6),
          size: 16,
        ),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: GoogleFonts.inter(color: const Color(0xFF3b82f6), fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
      ],
    );
  }

  InputDecoration _dropdownDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54),
      prefixIcon: Icon(icon, color: Colors.white54),
      filled: true,
      fillColor: const Color(0xFF161622),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3b82f6))),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {TextInputType? keyboardType, bool required = false}) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      validator: required ? (v) => v!.isEmpty ? 'Required' : null : null,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white54),
        prefixIcon: Icon(icon, color: Colors.white54),
        filled: true,
        fillColor: const Color(0xFF161622),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3b82f6))),
      ),
    );
  }
}
