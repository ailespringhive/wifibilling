import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/pop_in_bounce.dart';
import 'package:hugeicons/hugeicons.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  // Profile fields
  late TextEditingController _firstNameCtrl;
  late TextEditingController _lastNameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;

  // Password fields
  final _currentPwCtrl = TextEditingController();
  final _newPwCtrl = TextEditingController();
  final _confirmPwCtrl = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isChangingPassword = false;
  bool _isSavingProfile = false;
  bool _isUploadingAvatar = false;
  bool _isEditing = false;
  final ImagePicker _picker = ImagePicker();

  int _activeTab = 0;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthService>();
    final profile = auth.currentProfile;
    _firstNameCtrl = TextEditingController(text: profile?.firstName ?? '');
    _lastNameCtrl = TextEditingController(text: profile?.lastName ?? '');
    _emailCtrl = TextEditingController(text: profile?.email ?? '');
    _phoneCtrl = TextEditingController(text: profile?.phone ?? '');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _currentPwCtrl.dispose();
    _newPwCtrl.dispose();
    _confirmPwCtrl.dispose();
    super.dispose();
  }

  void _showSnackBar(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _changePassword() async {
    final currentPw = _currentPwCtrl.text;
    final newPw = _newPwCtrl.text;
    final confirmPw = _confirmPwCtrl.text;

    if (currentPw.isEmpty || newPw.isEmpty || confirmPw.isEmpty) {
      _showSnackBar('Please fill in all password fields.', AppTheme.accentAmber);
      return;
    }
    if (newPw != confirmPw) {
      _showSnackBar('New passwords do not match.', AppTheme.accentRose);
      return;
    }
    if (newPw.length < 8) {
      _showSnackBar('New password must be at least 8 characters.', AppTheme.accentRose);
      return;
    }

    setState(() => _isChangingPassword = true);
    try {
      final auth = context.read<AuthService>();
      await auth.updatePassword(newPw, currentPw);
      _currentPwCtrl.clear();
      _newPwCtrl.clear();
      _confirmPwCtrl.clear();
      if (mounted) _showSnackBar('Password updated successfully!', AppTheme.accentEmerald);
    } catch (e) {
      if (mounted) _showSnackBar('Failed to update: Check your current password.', AppTheme.accentRose);
    } finally {
      if (mounted) setState(() => _isChangingPassword = false);
    }
  }

  Future<void> _saveProfile() async {
    final first = _firstNameCtrl.text.trim();
    final last = _lastNameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final email = _emailCtrl.text.trim();

    if (first.isEmpty || last.isEmpty) {
      _showSnackBar('First and Last names are required.', AppTheme.accentAmber);
      return;
    }

    setState(() => _isSavingProfile = true);
    try {
      final auth = context.read<AuthService>();
      await auth.updateProfile({
        'firstName': first,
        'lastName': last,
        'phone': phone,
        'email': email,
      });
      if (mounted) {
        setState(() => _isEditing = false);
        _showSnackBar('Profile saved successfully!', AppTheme.accentEmerald);
      }
    } catch (e) {
      if (mounted) _showSnackBar('Failed to save profile. Please try again.', AppTheme.accentRose);
    } finally {
      if (mounted) setState(() => _isSavingProfile = false);
    }
  }

  Future<void> _pickAvatar() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;
      
      setState(() => _isUploadingAvatar = true);
      final auth = context.read<AuthService>();
      await auth.uploadAvatarAndSave(image);
      if (mounted) _showSnackBar('Profile image updated!', AppTheme.accentEmerald);
    } catch (e) {
      if (mounted) _showSnackBar('Failed to update image', AppTheme.accentRose);
    } finally {
      if (mounted) setState(() => _isUploadingAvatar = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.currentProfile;
    final name = profile?.fullName ?? 'Technician';
    final initials = profile?.initials ?? 'T';
    final firstName = profile?.firstName ?? 'T';
    final profileImageUrl = profile?.profileImage ?? '';

    return Scaffold(
      backgroundColor: Colors.white, // Unified flat background
      resizeToAvoidBottomInset: true, 
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
                child: Column(
                  children: [
                    // ── TOP PROFILE NAVIGATION CARD ──
                    PopInBounce(
                      delay: const Duration(milliseconds: 100),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Column(
                          children: [
                            GestureDetector(
                              onTap: _isUploadingAvatar ? null : _pickAvatar,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    width: 90,
                                    height: 90,
                                    decoration: BoxDecoration(
                                      gradient: profileImageUrl.isEmpty ? AppTheme.avatarGradient(firstName) : null,
                                      image: profileImageUrl.isNotEmpty ? DecorationImage(image: NetworkImage(profileImageUrl), fit: BoxFit.cover) : null,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 4),
                                      boxShadow: [
                                        BoxShadow(color: AppTheme.accentBlue.withValues(alpha: 0.15), blurRadius: 15, spreadRadius: 2, offset: const Offset(0, 4)),
                                      ],
                                    ),
                                    child: profileImageUrl.isEmpty
                                        ? Center(
                                            child: Text(
                                              initials,
                                              style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                                            ),
                                          )
                                        : null,
                                  ),
                                  if (_isUploadingAvatar)
                                    const SizedBox(
                                      width: 40, height: 40,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                                    ),
                                  if (!_isUploadingAvatar && profileImageUrl.isEmpty)
                                    Positioned(
                                      bottom: 0,
                                      right: 4,
                                      child: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: AppTheme.accentBlue, 
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 2),
                                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
                                        ),
                                        child: HugeIcon(icon: HugeIcons.strokeRoundedCamera01, color: Colors.white, size: 14.0),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              name,
                              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary, letterSpacing: -0.5),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.accentBlue.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(100),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  HugeIcon(icon: HugeIcons.strokeRoundedBriefcase02, size: 12.0, color: AppTheme.accentBlue),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Technician',
                                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accentBlue),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 28),
                            _buildSegmentedTabs(),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── BOTTOM CONTENT CARD ──
                    PopInBounce(
                      delay: const Duration(milliseconds: 200),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _activeTab == 0 ? 'Personal Information' : 'Security Settings',
                                  style: GoogleFonts.inter(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                if (_activeTab == 0 && !_isEditing)
                                  GestureDetector(
                                    onTap: () => setState(() => _isEditing = true),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: AppTheme.accentBlue.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Row(
                                        children: [
                                          HugeIcon(icon: HugeIcons.strokeRoundedEdit02, size: 14.0, color: AppTheme.accentBlue),
                                          const SizedBox(width: 4),
                                          Text('Edit', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.accentBlue)),
                                        ],
                                      ),
                                    ),
                                  ),
                                if (_activeTab == 0 && _isEditing)
                                  GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _isEditing = false;
                                        final auth = context.read<AuthService>();
                                        final profile = auth.currentProfile;
                                        _firstNameCtrl.text = profile?.firstName ?? '';
                                        _lastNameCtrl.text = profile?.lastName ?? '';
                                        _emailCtrl.text = profile?.email ?? '';
                                        _phoneCtrl.text = profile?.phone ?? '';
                                      });
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: AppTheme.bgDark,
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text('Cancel', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            if (_activeTab == 0) ...[
                              // Personal Info Form
                              Row(
                                children: [
                                  Expanded(child: _buildFormField('First Name', _firstNameCtrl, icon: HugeIcons.strokeRoundedUser, readOnly: !_isEditing)),
                                  const SizedBox(width: 16),
                                  Expanded(child: _buildFormField('Last Name', _lastNameCtrl, icon: HugeIcons.strokeRoundedUser, readOnly: !_isEditing)),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(child: _buildFormField('Email Address', _emailCtrl, type: TextInputType.emailAddress, icon: HugeIcons.strokeRoundedMail01, readOnly: !_isEditing)),
                                  const SizedBox(width: 16),
                                  Expanded(child: _buildFormField('Phone Number', _phoneCtrl, type: TextInputType.phone, hint: '09XX', icon: HugeIcons.strokeRoundedCall02, readOnly: !_isEditing)),
                                ],
                              ),
                              const SizedBox(height: 16),
                              _buildFormField('Role', null, readOnly: true, value: 'Technician', icon: HugeIcons.strokeRoundedBriefcase02),

                              if (_isEditing) ...[
                                const SizedBox(height: 40),
                                SizedBox(
                                  width: double.infinity,
                                  child: _buildActionButton(
                                    icon: HugeIcons.strokeRoundedFloppyDisk,
                                    label: _isSavingProfile ? 'Saving...' : 'Save',
                                    isLoading: _isSavingProfile,
                                    onPressed: _isSavingProfile ? null : _saveProfile,
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ] else ...[
                                const SizedBox(height: 40),
                              ],
                              SizedBox(
                                width: double.infinity,
                                child: _buildSignOutBtn(context),
                              ),
                            ] else ...[
                              // Password Form
                              _buildPasswordField('Current Password', _currentPwCtrl, _obscureCurrent, () => setState(() => _obscureCurrent = !_obscureCurrent)),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(child: _buildPasswordField('New Password', _newPwCtrl, _obscureNew, () => setState(() => _obscureNew = !_obscureNew))),
                                  const SizedBox(width: 16),
                                  Expanded(child: _buildPasswordField('Confirm Password', _confirmPwCtrl, _obscureConfirm, () => setState(() => _obscureConfirm = !_obscureConfirm))),
                                ],
                              ),

                              const SizedBox(height: 40),
                              SizedBox(
                                width: double.infinity,
                                child: _buildActionButton(
                                  icon: HugeIcons.strokeRoundedKey01,
                                  label: _isChangingPassword ? 'Updating...' : 'Update Password',
                                  isLoading: _isChangingPassword,
                                  onPressed: _isChangingPassword ? null : _changePassword,
                                ),
                              ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: _buildSignOutBtn(context),
                              ),
                            ],
                          ],
                        ),
                      )
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSegmentedTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppTheme.bgDark.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Expanded(child: _buildSegmentButton('Personal Details', 0, HugeIcons.strokeRoundedUser)),
          Expanded(child: _buildSegmentButton('Password', 1, HugeIcons.strokeRoundedLockKey)),
        ],
      ),
    );
  }

  Widget _buildSegmentButton(String label, int index, List<List<dynamic>> icon) {
    bool isActive = _activeTab == index;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isActive ? [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))
          ] : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            HugeIcon(icon: icon, size: 16.0, color: isActive ? AppTheme.accentBlue : AppTheme.textMuted),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                  color: isActive ? AppTheme.textPrimary : AppTheme.textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({required String label, required List<List<dynamic>> icon, required bool isLoading, required VoidCallback? onPressed}) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.accentBlue, Color(0xFF4A8985)], // Slight gradient
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accentBlue.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ]
      ),
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: isLoading 
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : HugeIcon(icon: icon, size: 18.0, color: Colors.white),
        label: Text(label, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 18),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Widget _buildFormField(String label, TextEditingController? controller, {
    TextInputType type = TextInputType.text,
    String? hint,
    bool readOnly = false,
    String? value,
    List<List<dynamic>>? icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.bgDark, // Clean solid fill, no border
            borderRadius: BorderRadius.circular(12),
          ),
          child: readOnly
              ? Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      if (icon != null) ...[
                        HugeIcon(icon: icon, color: AppTheme.textMuted, size: 18.0),
                        const SizedBox(width: 10),
                      ],
                      Expanded(
                        child: Text(value ?? controller?.text ?? '', style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ),
                )
              : TextField(
                  controller: controller,
                  keyboardType: type,
                  style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    hintText: hint,
                    isDense: true,
                    hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
                    prefixIcon: icon != null ? Padding(
                      padding: const EdgeInsets.only(left: 16, right: 12),
                      child: HugeIcon(icon: icon, color: AppTheme.textMuted, size: 18.0),
                    ) : null,
                    prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildPasswordField(String label, TextEditingController controller, bool obscure, VoidCallback onToggle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.bgDark, // Clean solid fill, no border
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
            decoration: InputDecoration(
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              isDense: true,
              hintText: 'Enter ${label.toLowerCase()}',
              hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
              prefixIcon: Padding(
                padding: const EdgeInsets.only(left: 16, right: 12),
                child: HugeIcon(icon: HugeIcons.strokeRoundedSquareLock02, color: AppTheme.textMuted, size: 18.0),
              ),
              prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              suffixIcon: IconButton(
                icon: HugeIcon(icon: obscure ? HugeIcons.strokeRoundedViewOff : HugeIcons.strokeRoundedViewOffSlash, size: 20.0, color: AppTheme.textMuted),
                onPressed: onToggle,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSignOutBtn(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () async {
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppTheme.bgCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: AppTheme.border)),
            title: Text('Sign Out', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            content: Text('Are you sure you want to sign out?', style: GoogleFonts.inter(color: AppTheme.textSecondary)),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: GoogleFonts.inter(color: AppTheme.textMuted))),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: TextButton.styleFrom(foregroundColor: AppTheme.accentRose),
                child: Text('Sign Out', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        );
        if (confirm == true && mounted) {
          final authService = context.read<AuthService>();
          await authService.logout();
        }
      },
      icon: HugeIcon(icon: HugeIcons.strokeRoundedLogout01, color: AppTheme.accentRose, size: 18.0),
      label: Text('Log Out', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold)),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppTheme.accentRose,
        padding: const EdgeInsets.symmetric(vertical: 18),
        side: BorderSide(color: AppTheme.accentRose.withValues(alpha: 0.3), width: 1.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        backgroundColor: AppTheme.accentRose.withValues(alpha: 0.05),
      ),
    );
  }
}

