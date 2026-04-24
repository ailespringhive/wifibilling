import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:latlong2/latlong.dart';
import 'dart:io';
import 'package:flutter/foundation.dart';

import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/customer_service.dart';
import '../services/repair_ticket_service.dart';
import '../models/user_profile.dart';
import '../widgets/location_picker.dart';

class CreateTicketScreen extends StatefulWidget {
  const CreateTicketScreen({super.key});

  @override
  State<CreateTicketScreen> createState() => _CreateTicketScreenState();
}

class _CreateTicketScreenState extends State<CreateTicketScreen> {
  final _issueCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  
  List<UserProfile> _customers = [];
  bool _isLoadingCustomers = true;
  bool _isSubmitting = false;
  
  UserProfile? _selectedCustomer;
  String _selectedPriority = 'medium';
  final List<XFile> _selectedImages = [];
  LatLng? _selectedLocation;
  TextEditingController? _autoCompleteCtrl;
  final _addressCtrl = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }
  
  @override
  void dispose() {
    _issueCtrl.dispose();
    _notesCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    try {
      final customers = await CustomerService().getAllCustomers(limit: 100);
      setState(() {
        _customers = customers;
        _isLoadingCustomers = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingCustomers = false);
        _showSnackBar('Failed to load customers', AppTheme.accentRose);
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    if (_selectedImages.length >= 3) {
      _showSnackBar('Maximum of 3 images allowed', AppTheme.accentAmber);
      return;
    }
    
    try {
      final XFile? image = await _picker.pickImage(source: source, imageQuality: 70);
      if (image != null) {
        setState(() => _selectedImages.add(image));
      }
    } catch (e) {
      _showSnackBar('Error picking image', AppTheme.accentRose);
    }
  }

  Future<void> _pickLocation() async {
    final result = await Navigator.push<LatLng>(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPicker(
          initialLocation: _selectedLocation ?? const LatLng(14.5995, 120.9842),
        ),
      ),
    );
    if (result != null) {
      setState(() => _selectedLocation = result);
    }
  }

  void _showSnackBar(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _submitTicket() async {
    final customerInputText = _autoCompleteCtrl?.text.trim() ?? '';
    if (_selectedCustomer == null && customerInputText.isEmpty) {
      _showSnackBar('Please select or type a customer name', AppTheme.accentAmber);
      return;
    }
    if (_issueCtrl.text.trim().isEmpty) {
      _showSnackBar('Please describe the issue', AppTheme.accentAmber);
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final auth = context.read<AuthService>();
      final techId = auth.collectorId; 

      final ticketService = RepairTicketService();
      
      // Upload images first
      List<String> uploadedUrls = [];
      for (var img in _selectedImages) {
        final bytes = await img.readAsBytes();
        final url = await ticketService.uploadTicketImageBytes(bytes, img.name);
        if (url != null) uploadedUrls.add(url);
      }

      String customerIdToSave;
      String customerNameToSave;
      String customerAddressToSave;

      if (_selectedCustomer != null) {
        customerIdToSave = _selectedCustomer!.userId.isNotEmpty ? _selectedCustomer!.userId : _selectedCustomer!.id;
        customerNameToSave = _selectedCustomer!.fullName;
        customerAddressToSave = _addressCtrl.text.trim().isNotEmpty ? _addressCtrl.text.trim() : _selectedCustomer!.address;
      } else {
        customerIdToSave = 'CUST-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
        customerNameToSave = customerInputText;
        customerAddressToSave = _addressCtrl.text.trim().isNotEmpty ? _addressCtrl.text.trim() : 'Not provided';
      }

      final data = {
        'customerId': customerIdToSave,
        'customerName': customerNameToSave,
        'customerAddress': customerAddressToSave,
        'technicianId': techId,
        'status': 'pending',
        'priority': _selectedPriority,
        'issue': _issueCtrl.text.trim(),
        'notes': _notesCtrl.text.trim(),
        'latitude': _selectedLocation?.latitude,
        'longitude': _selectedLocation?.longitude,
        'imageUrls': uploadedUrls,
      };

      final ticket = await ticketService.createTicket(data);
      if (ticket != null) {
        // Send notification to admin
        await ticketService.sendAdminNotification(auth.currentProfile?.fullName ?? 'Technician', customerNameToSave, 'pending');
        if (mounted) {
          _showSnackBar('Ticket created successfully', AppTheme.accentEmerald);
          Navigator.pop(context, true);
        }
      } else {
        throw Exception('Failed to create ticket');
      }
    } catch (e) {
      _showSnackBar('Failed to submit ticket', AppTheme.accentRose);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text('Create Repair Ticket', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 16)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        centerTitle: true,
      ),
      body: _isLoadingCustomers 
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildLabel('Customer'),
                  const SizedBox(height: 8),
                  Autocomplete<UserProfile>(
                    displayStringForOption: (UserProfile option) => option.fullName,
                    optionsBuilder: (TextEditingValue textEditingValue) {
                      if (textEditingValue.text.isEmpty) {
                        return const Iterable<UserProfile>.empty();
                      }
                      return _customers.where((UserProfile customer) {
                        return customer.fullName.toLowerCase().contains(textEditingValue.text.toLowerCase()) || 
                               customer.userId.toLowerCase().contains(textEditingValue.text.toLowerCase());
                      });
                    },
                    onSelected: (UserProfile selection) {
                      setState(() {
                        _selectedCustomer = selection;
                        if (selection.address.isNotEmpty) {
                          _addressCtrl.text = selection.address;
                        }
                      });
                    },
                    fieldViewBuilder: (BuildContext context, TextEditingController textEditingController, FocusNode focusNode, VoidCallback onFieldSubmitted) {
                      _autoCompleteCtrl = textEditingController;
                      return TextField(
                        controller: textEditingController,
                        focusNode: focusNode,
                        style: GoogleFonts.inter(fontSize: 14),
                        decoration: _inputDecoration('Search customer by name or ID...'),
                      );
                    },
                    optionsViewBuilder: (BuildContext context, AutocompleteOnSelected<UserProfile> onSelected, Iterable<UserProfile> options) {
                      return Align(
                        alignment: Alignment.topLeft,
                        child: Material(
                          elevation: 4,
                          borderRadius: BorderRadius.circular(12),
                          color: Colors.white,
                          child: Container(
                            width: MediaQuery.of(context).size.width - 40,
                            constraints: const BoxConstraints(maxHeight: 200),
                            child: ListView.builder(
                              padding: EdgeInsets.zero,
                              shrinkWrap: true,
                              itemCount: options.length,
                              itemBuilder: (BuildContext context, int index) {
                                final UserProfile option = options.elementAt(index);
                                return ListTile(
                                  title: Text(option.fullName, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500)),
                                  subtitle: Text(option.userId, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
                                  onTap: () {
                                    onSelected(option);
                                  },
                                );
                              },
                            ),
                          ),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 20),
                  _buildLabel('Priority'),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildPriorityChip('Low', 'low', Colors.green),
                      const SizedBox(width: 8),
                      _buildPriorityChip('Medium', 'medium', Colors.orange),
                      const SizedBox(width: 8),
                      _buildPriorityChip('High', 'high', Colors.red),
                    ],
                  ),

                  const SizedBox(height: 20),
                  _buildLabel('Issue Description'),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _issueCtrl,
                    maxLines: 3,
                    decoration: _inputDecoration('Briefly describe the issue (e.g. LOS Red Light)'),
                    style: GoogleFonts.inter(fontSize: 14),
                  ),

                  const SizedBox(height: 20),
                  _buildLabel('Attachments (Max 3)'),
                  const SizedBox(height: 8),
                  if (_selectedImages.isNotEmpty)
                    SizedBox(
                      height: 100,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _selectedImages.length,
                        itemBuilder: (ctx, i) {
                          return Stack(
                            children: [
                              Container(
                                width: 100,
                                margin: const EdgeInsets.only(right: 12),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  image: DecorationImage(
                                    image: kIsWeb ? NetworkImage(_selectedImages[i].path) : FileImage(File(_selectedImages[i].path)) as ImageProvider,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 4, right: 16,
                                child: GestureDetector(
                                  onTap: () => setState(() => _selectedImages.removeAt(i)),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                    child: const Icon(Icons.close, size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  if (_selectedImages.length < 3)
                    Padding(
                      padding: EdgeInsets.only(top: _selectedImages.isEmpty ? 0 : 12.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _pickImage(ImageSource.camera),
                              icon: const HugeIcon(icon: HugeIcons.strokeRoundedCamera01, color: Colors.white, size: 18),
                              label: Text('Camera', style: GoogleFonts.inter(color: Colors.white)),
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentBlue, elevation: 0),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _pickImage(ImageSource.gallery),
                              icon: const HugeIcon(icon: HugeIcons.strokeRoundedImage01, color: Colors.white, size: 18),
                              label: Text('Gallery', style: GoogleFonts.inter(color: Colors.white)),
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentBlue, elevation: 0),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 20),
                  _buildLabel('Address (Optional)'),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _addressCtrl,
                    style: GoogleFonts.inter(fontSize: 14),
                    decoration: _inputDecoration('Enter customer address...'),
                  ),

                  const SizedBox(height: 20),
                  _buildLabel('Location (Optional)'),
                  const SizedBox(height: 8),
                  ListTile(
                    onTap: _pickLocation,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    tileColor: Colors.white,
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: AppTheme.accentBlue.withValues(alpha: 0.1), shape: BoxShape.circle),
                      child: HugeIcon(icon: HugeIcons.strokeRoundedLocation01, color: AppTheme.accentBlue, size: 20),
                    ),
                    title: Text(_selectedLocation != null ? 'Location Selected' : 'Tap to pin location', style: GoogleFonts.inter(fontSize: 14)),
                    subtitle: _selectedLocation != null ? Text('${_selectedLocation!.latitude.toStringAsFixed(4)}, ${_selectedLocation!.longitude.toStringAsFixed(4)}', style: GoogleFonts.inter(fontSize: 12)) : null,
                    trailing: const HugeIcon(icon: HugeIcons.strokeRoundedArrowRight01, color: AppTheme.textMuted, size: 16),
                  ),

                  const SizedBox(height: 20),
                  _buildLabel('Additional Notes (Optional)'),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _notesCtrl,
                    maxLines: 2,
                    decoration: _inputDecoration('Any extra context?'),
                    style: GoogleFonts.inter(fontSize: 14),
                  ),

                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitTicket,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentBlue,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: _isSubmitting 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text('Submit Ticket', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
    );
  }

  Widget _buildPriorityChip(String label, String value, Color color) {
    final isSelected = _selectedPriority == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedPriority = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.1) : Colors.white,
          border: Border.all(color: isSelected ? color : Colors.grey.shade300),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? color : AppTheme.textMuted,
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppTheme.accentBlue),
      ),
    );
  }
}
