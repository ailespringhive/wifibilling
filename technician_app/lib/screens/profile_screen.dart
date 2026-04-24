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
      backgroundColor: AppTheme.bgDark, // Base background color
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
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                        color: AppTheme.bgCard,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: Column(
                        children: [
                          GestureDetector(
                            onTap: _isUploadingAvatar ? null : _pickAvatar,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  decoration: BoxDecoration(
                                    gradient: profileImageUrl.isEmpty ? AppTheme.avatarGradient(firstName) : null,
                                    image: profileImageUrl.isNotEmpty ? DecorationImage(image: NetworkImage(profileImageUrl), fit: BoxFit.cover) : null,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.3), width: 3),
                                    boxShadow: [
                                      BoxShadow(color: AppTheme.accentBlue.withValues(alpha: 0.2), blurRadius: 10),
                                    ],
                                  ),
                                  child: profileImageUrl.isEmpty
                                      ? Center(
                                          child: Text(
                                            initials,
                                            style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                                          ),
                                        )
                                      : null,
                                ),
                                if (_isUploadingAvatar)
                                  const SizedBox(
                                    width: 30, height: 30,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                                  ),
                                if (!_isUploadingAvatar && profileImageUrl.isEmpty)
                                  Positioned(
                                    bottom: 0,
                                    right: 4,
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: const BoxDecoration(color: AppTheme.accentBlue, shape: BoxShape.circle),
                                      child: HugeIcon(icon: HugeIcons.strokeRoundedCamera01, color: Colors.white, size: 14.0),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            name,
                            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Technician',
                            style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textMuted),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            children: [
                              Expanded(child: _buildTabButton('Personal Information', 0, HugeIcons.strokeRoundedUser)),
                              const SizedBox(width: 12),
                              Expanded(child: _buildTabButton('Password', 1, HugeIcons.strokeRoundedLockKey)),
                            ],
                          )
                        ],
                      ),
                    )),

                    const SizedBox(height: 16),

                    // ── BOTTOM CONTENT CARD ──
                    PopInBounce(
                      delay: const Duration(milliseconds: 200),
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                        color: AppTheme.bgCard,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _activeTab == 0 ? 'Personal Information' : 'Change Password',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 24),

                          if (_activeTab == 0) ...[
                            // Personal Info Form
                            Row(
                              children: [
                                Expanded(child: _buildFormField('First Name', _firstNameCtrl)),
                                const SizedBox(width: 16),
                                Expanded(child: _buildFormField('Last Name', _lastNameCtrl)),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(child: _buildFormField('Email', _emailCtrl, type: TextInputType.emailAddress)),
                                const SizedBox(width: 16),
                                Expanded(child: _buildFormField('Phone Number', _phoneCtrl, type: TextInputType.phone, hint: '09XX')),
                              ],
                            ),
                            const SizedBox(height: 16),
                            _buildFormField('Role', null, readOnly: true, value: 'Technician'),

                            const SizedBox(height: 32),
                            Row(
                              children: [
                                Expanded(child: _buildSignOutBtn(context)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildActionButton(
                                    icon: HugeIcons.strokeRoundedFloppyDisk,
                                    label: _isSavingProfile ? 'Saving...' : 'Save Changes',
                                    isLoading: _isSavingProfile,
                                    onPressed: _isSavingProfile ? null : _saveProfile,
                                  ),
                                ),
                              ],
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

                            const SizedBox(height: 32),
                            Row(
                              children: [
                                Expanded(child: _buildSignOutBtn(context)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildActionButton(
                                    icon: HugeIcons.strokeRoundedKey01,
                                    label: _isChangingPassword ? 'Updating...' : 'Update Password',
                                    isLoading: _isChangingPassword,
                                    onPressed: _isChangingPassword ? null : _changePassword,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    )),

                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton(String label, int index, List<List<dynamic>> hugeIcon) {
    bool isActive = _activeTab == index;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.accentBlue.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? AppTheme.accentBlue.withValues(alpha: 0.5) : AppTheme.border,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            HugeIcon(icon: hugeIcon, size: 18.0, color: isActive ? AppTheme.accentBlue : AppTheme.textMuted),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                softWrap: false,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w600,
                  color: isActive ? AppTheme.accentBlue : AppTheme.textMuted,
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
        color: AppTheme.accentBlue,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accentBlue.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ]
      ),
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: isLoading 
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : HugeIcon(icon: icon, size: 18.0, color: Colors.white),
        label: FittedBox(fit: BoxFit.scaleDown, child: Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold))),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
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
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.bgDark.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
          ),
          child: readOnly
              ? Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(value ?? '', style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary)),
                  ),
                )
              : TextField(
                  controller: controller,
                  keyboardType: type,
                  style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    hintText: hint,
                    isDense: true,
                    hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
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
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.bgDark.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              isDense: true,
              hintText: 'Enter ${label.toLowerCase()}',
              hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
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
    return TextButton.icon(
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
      label: FittedBox(fit: BoxFit.scaleDown, child: Text('Sign Out', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold))),
      style: TextButton.styleFrom(
        foregroundColor: AppTheme.accentRose,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        backgroundColor: AppTheme.accentRose.withValues(alpha: 0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: AppTheme.accentRose.withValues(alpha: 0.2)),
        ),
      ),
    );
  }
}
