import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/local_cache_service.dart';
import '../theme/app_theme.dart';

class OfflineSyncScreen extends StatefulWidget {
  const OfflineSyncScreen({super.key});

  @override
  State<OfflineSyncScreen> createState() => _OfflineSyncScreenState();
}

class _OfflineSyncScreenState extends State<OfflineSyncScreen> {
  final LocalCacheService _cache = LocalCacheService();
  List<Map<String, dynamic>> _queue = [];
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _loadQueue();
  }

  void _loadQueue() {
    setState(() {
      _queue = _cache.getPendingQueue();
    });
  }

  Future<void> _syncNow() async {
    if (_queue.isEmpty) return;
    setState(() => _isSyncing = true);

    try {
      await _cache.processPendingQueue();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offline payments successfully synced to cloud.'),
            backgroundColor: AppTheme.accentEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sync failed. Please check your internet connection.'),
            backgroundColor: AppTheme.accentRose,
          ),
        );
      }
    } finally {
      if (mounted) {
        _loadQueue();
        setState(() => _isSyncing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Text('Pending Uploads', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18)),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
      ),
      body: _queue.isEmpty
          ? _buildEmptyState()
          : Column(
              children: [
                _buildSyncHeader(),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    itemCount: _queue.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = _queue[index];
                      final dateStr = item['timestamp'] ?? '';
                      final date = DateTime.tryParse(dateStr)?.toLocal() ?? DateTime.now();
                      final shortDate = DateFormat('MMM dd, yyyy - hh:mm a').format(date);
                      
                      final action = item['action'] ?? 'Unknown Action';
                      final data = item['data'] as Map<String, dynamic>? ?? {};
                      final paymentStatus = data['paymentStatus'] == 'already_paid' ? 'Paid' : 'Partial';

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.border),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.accentPurple.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.cloud_upload_outlined, color: AppTheme.accentPurple),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    action == 'update_payment' ? 'Payment Record ($paymentStatus)' : action,
                                    style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    shortDate,
                                    style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Billing ID: ${item['billingId']}',
                                    style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade400),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_done_rounded, size: 80, color: AppTheme.accentEmerald.withValues(alpha: 0.2)),
          const SizedBox(height: 16),
          Text(
            'All Caught Up!',
            style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            'No pending payments waiting to be synced.',
            style: GoogleFonts.inter(color: AppTheme.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildSyncHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.accentPurple, const Color(0xFF6366F1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accentPurple.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            '${_queue.length} Pending Actions',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            'Connect to the internet and tap sync to upload these records to the cloud.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 12, color: Colors.white.withValues(alpha: 0.8)),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: _isSyncing ? null : _syncNow,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.accentPurple,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _isSyncing 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentPurple))
                  : const Icon(Icons.sync, size: 20),
              label: Text(
                _isSyncing ? 'Syncing...' : 'Sync to Cloud',
                style: GoogleFonts.inter(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
