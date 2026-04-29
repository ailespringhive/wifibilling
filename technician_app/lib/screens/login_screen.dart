import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import 'package:provider/provider.dart';
import 'dart:math' as math;
import 'package:hugeicons/hugeicons.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _isButtonPressed = false;

  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _emailFocus.addListener(() => setState(() {}));
    _passwordFocus.addListener(() => setState(() {}));

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();

    _loadSavedCredentials();
  }

  Future<void> _loadSavedCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final savedEmail = prefs.getString('remember_email') ?? '';
    final savedPassword = prefs.getString('remember_password') ?? '';
    final rememberMe = prefs.getBool('remember_me') ?? false;

    if (rememberMe && savedEmail.isNotEmpty) {
      setState(() {
        _emailController.text = savedEmail;
        _passwordController.text = savedPassword;
        _rememberMe = true;
      });
    }
  }

  Future<void> _saveCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    if (_rememberMe) {
      await prefs.setString('remember_email', _emailController.text.trim());
      await prefs.setString('remember_password', _passwordController.text);
      await prefs.setBool('remember_me', true);
    } else {
      await prefs.remove('remember_email');
      await prefs.remove('remember_password');
      await prefs.setBool('remember_me', false);
    }
  }

  Future<void> _handleLogin() async {
    final auth = context.read<AuthService>();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) return;

    await _saveCredentials();
    // No Navigator call — AuthGate reacts to notifyListeners() via context.watch
    await auth.login(email, password);
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Widget _build3DTitle() {
    return AnimatedBuilder(
      animation: _animController,
      builder: (context, child) {
        double getWave(double delaySeconds) {
          double timeInSeconds = _animController.value * 2.4;
          double shiftedTime = timeInSeconds - delaySeconds;
          double rads = (shiftedTime / 2.4) * 2 * math.pi;
          return (math.sin(rads - math.pi / 2) + 1.0) / 2.0;
        }

        Offset getDepthOffset(double delaySeconds) {
          double t = getWave(delaySeconds);
          return Offset(4.0 + (16.0 * t), 4.0 + (16.0 * t));
        }

        final textStyle = GoogleFonts.inter(
          fontSize: 50,
          fontWeight: FontWeight.w900,
          letterSpacing: -1.5,
        );

        const String text = 'wifi billing';

        return Transform(
          alignment: Alignment.center,
          transform: Matrix4.identity()
            ..rotateZ(-10 * math.pi / 180)
            ..multiply(
              Matrix4.identity()..setEntry(0, 1, math.tan(-10 * math.pi / 180)),
            ),
          child: SizedBox(
            width: 280,
            height: 70,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  left: getDepthOffset(0.15).dx,
                  top: getDepthOffset(0.15).dy,
                  child: Text(
                    text,
                    style: textStyle.copyWith(color: const Color(0xFFFF4D4D)),
                  ),
                ),
                Positioned(
                  left: getDepthOffset(0.10).dx,
                  top: getDepthOffset(0.10).dy,
                  child: Text(
                    text,
                    style: textStyle.copyWith(color: const Color(0xFFFF4D4D)),
                  ),
                ),
                Positioned(
                  left: getDepthOffset(0.05).dx,
                  top: getDepthOffset(0.05).dy,
                  child: Text(
                    text,
                    style: textStyle.copyWith(color: const Color(0xFFFF4D4D)),
                  ),
                ),
                Positioned(
                  left: getDepthOffset(0.0).dx,
                  top: getDepthOffset(0.0).dy,
                  child: Text(
                    text,
                    style: textStyle.copyWith(color: const Color(0xFFFF4D4D)),
                  ),
                ),
                Positioned(
                  left: getWave(0.0) * 18.0,
                  top: getWave(0.0) * -6.0,
                  child: Text(
                    text,
                    style: textStyle.copyWith(color: const Color(0xFF00D9FF)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String label,
    required String hint,
    required List<List<dynamic>> prefixIcon,
    bool isPassword = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1A1A1A),
          ),
        ),
        const SizedBox(height: 8),
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          decoration: BoxDecoration(
            color: focusNode.hasFocus
                ? Colors.white
                : Colors.white.withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: focusNode.hasFocus
                  ? const Color(0xFF1A1A1A)
                  : Colors.grey.shade300,
              width: focusNode.hasFocus ? 1.5 : 1.0,
            ),
            boxShadow: focusNode.hasFocus
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [],
          ),
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            obscureText: isPassword ? _obscurePassword : false,
            keyboardType: isPassword
                ? TextInputType.text
                : TextInputType.emailAddress,
            style: GoogleFonts.inter(color: Colors.black87, fontSize: 15),
            decoration: InputDecoration(
              prefixIcon: Padding(
                padding: const EdgeInsets.only(left: 12.0, right: 8.0),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOutBack,
                  transformAlignment: Alignment.center,
                  transform: Matrix4.identity()
                    ..translate(focusNode.hasFocus ? 4.0 : 0.0, 0.0)
                    ..scale(focusNode.hasFocus ? 1.2 : 1.0),
                  child: HugeIcon(
                    icon: prefixIcon,
                    color: focusNode.hasFocus
                        ? const Color(0xFF1A1A1A)
                        : Colors.grey.shade600,
                    size: 22.0,
                  ),
                ),
              ),
              hintText: hint,
              hintStyle: GoogleFonts.inter(
                color: Colors.grey.shade400,
                fontSize: 15,
              ),
              border: InputBorder.none,
              filled: true,
              fillColor: Colors.transparent,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 16,
              ),
              suffixIcon: isPassword
                  ? IconButton(
                      icon: HugeIcon(
                        icon: _obscurePassword
                            ? HugeIcons.strokeRoundedViewOff
                            : HugeIcons.strokeRoundedViewOffSlash,
                        color: Colors.grey.shade600,
                        size: 22.0,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    )
                  : null,
            ),
            onSubmitted: (_) => isPassword ? _handleLogin() : null,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE0E3E8),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                const SizedBox(height: 52),

                // 3D Animated Title (same as collector)
                Center(child: _build3DTitle()),

                const SizedBox(height: 32),
                Text(
                  'Sign in to continue to WiFi Technician',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 40),

                // Email field
                _buildTextField(
                  controller: _emailController,
                  focusNode: _emailFocus,
                  label: 'Email',
                  hint: 'Enter your email',
                  prefixIcon: HugeIcons.strokeRoundedMail01,
                ),
                const SizedBox(height: 24),

                // Password field
                _buildTextField(
                  controller: _passwordController,
                  focusNode: _passwordFocus,
                  label: 'Password',
                  hint: 'Enter your password',
                  prefixIcon: HugeIcons.strokeRoundedLockKey,
                  isPassword: true,
                ),
                const SizedBox(height: 16),

                // Remember Me / Forgot Password
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () => setState(() => _rememberMe = !_rememberMe),
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: 4,
                          horizontal: 2,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: Checkbox(
                                value: _rememberMe,
                                onChanged: (val) =>
                                    setState(() => _rememberMe = val ?? false),
                                activeColor: const Color(0xFF1A1A1A),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                side: BorderSide(color: Colors.grey.shade400),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Remember me',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: Colors.grey.shade700,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: Text(
                              'Reset Password',
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            content: Text(
                              'Please contact the Administrator to reset your password.',
                              style: GoogleFonts.inter(),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: Text(
                                  'OK',
                                  style: GoogleFonts.inter(
                                    color: Colors.blue,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'Forgot Password?',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF1A1A1A),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // Error + Button via Consumer (prevents full tree rebuild)
                Consumer<AuthService>(
                  builder: (context, auth, _) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (auth.error != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Row(
                              children: [
                                HugeIcon(
                                  icon: HugeIcons.strokeRoundedAlertCircle,
                                  color: Colors.red,
                                  size: 20.0,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    auth.error!,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      color: Colors.red.shade800,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],

                        // Log In button with press animation
                        GestureDetector(
                          onTapDown: (_) {
                            if (!auth.isLoading) {
                              setState(() => _isButtonPressed = true);
                            }
                          },
                          onTapUp: (_) {
                            setState(() => _isButtonPressed = false);
                            if (!auth.isLoading) _handleLogin();
                          },
                          onTapCancel: () =>
                              setState(() => _isButtonPressed = false),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            curve: Curves.easeOutBack,
                            width: double.infinity,
                            height: 56,
                            transformAlignment: Alignment.center,
                            transform: Matrix4.identity()
                              ..scale(_isButtonPressed ? 0.95 : 1.0),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1C1D21),
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: _isButtonPressed
                                  ? []
                                  : [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.15,
                                        ),
                                        blurRadius: 10,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                            ),
                            child: Center(
                              child: auth.isLoading
                                  ? const SizedBox(
                                      height: 24,
                                      width: 24,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      'Log In',
                                      style: GoogleFonts.inter(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
