import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

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

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.currentProfile;
    final name = profile?.fullName ?? 'Technician';
    final initials = profile?.initials ?? 'C';
    final firstName = profile?.firstName ?? 'C';

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        title: Text('Technician Profile', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16)),
        backgroundColor: AppTheme.bgDark,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 40),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Profile Header ──
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.bgDark.withValues(alpha: 0.5),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  border: const Border(bottom: BorderSide(color: AppTheme.border)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: AppTheme.avatarGradient(firstName),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.accentBlue.withValues(alpha: 0.2),
                            blurRadius: 12,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          initials,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Technician',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppTheme.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ── Form Fields ──
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // First Name + Last Name side by side
                    Row(
                      children: [
                        Expanded(child: _buildFormField('First Name', _firstNameCtrl)),
                        const SizedBox(width: 12),
                        Expanded(child: _buildFormField('Last Name', _lastNameCtrl)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Email + Phone side by side
                    Row(
                      children: [
                        Expanded(child: _buildFormField('Email', _emailCtrl, type: TextInputType.emailAddress)),
                        const SizedBox(width: 12),
                        Expanded(child: _buildFormField('Phone', _phoneCtrl, type: TextInputType.phone, hint: '09XX XXX XXXX')),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Role (read-only)
                    _buildFormField('Role', null, readOnly: true, value: 'Technician'),

                    // ── Divider + Change Password ──
                    const SizedBox(height: 8),
                    Container(height: 1, color: AppTheme.border),
                    const SizedBox(height: 20),

                    Row(
                      children: [
                        Icon(Icons.lock_outline, size: 18, color: AppTheme.accentAmber),
                        const SizedBox(width: 8),
                        Text(
                          'Change Password',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    _buildPasswordField('Current Password', _currentPwCtrl, _obscureCurrent,
                        () => setState(() => _obscureCurrent = !_obscureCurrent)),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Expanded(
                          child: _buildPasswordField('New Password', _newPwCtrl, _obscureNew,
                              () => setState(() => _obscureNew = !_obscureNew)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildPasswordField('Confirm New Password', _confirmPwCtrl, _obscureConfirm,
                              () => setState(() => _obscureConfirm = !_obscureConfirm)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Update Password button
                    OutlinedButton.icon(
                      onPressed: _isChangingPassword ? null : _changePassword,
                      icon: _isChangingPassword
                          ? const SizedBox(
                              width: 16, height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentAmber),
                            )
                          : const Icon(Icons.vpn_key_outlined, size: 16),
                      label: Text(
                        _isChangingPassword ? 'Updating...' : 'Update Password',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.accentAmber,
                        side: const BorderSide(color: AppTheme.accentAmber),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Footer: Cancel + Save ──
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: AppTheme.border)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: Text(
                        'Cancel',
                        style: GoogleFonts.inter(
                          color: AppTheme.textMuted,
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      decoration: BoxDecoration(
                        gradient: AppTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.accentBlue.withValues(alpha: 0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ElevatedButton.icon(
                        onPressed: () {
                          _showSnackBar('Profile saved!', AppTheme.accentEmerald);
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.save_outlined, size: 16),
                        label: Text(
                          'Save Changes',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
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
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.bgDark,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.border),
          ),
          child: readOnly
              ? Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Text(
                    value ?? '',
                    style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
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
                    hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 14),
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
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.bgDark,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.border),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              hintText: 'Enter ${label.toLowerCase()}',
              hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 14),
              suffixIcon: IconButton(
                icon: Icon(
                  obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  size: 18,
                  color: AppTheme.textMuted,
                ),
                onPressed: onToggle,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
