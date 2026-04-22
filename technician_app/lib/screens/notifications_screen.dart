import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../models/notification_model.dart';
import '../models/user_profile.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hugeicons/hugeicons.dart';
import '../widgets/pop_in_bounce.dart';

class NotificationsScreen extends StatefulWidget {
  final UserProfile collector;

  const NotificationsScreen({super.key, required this.collector});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();
  bool _isLoading = true;
  List<TechnicianNotification> _notifications = [];

  bool _isExpanded = false;
  bool _selectionMode = false;
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    final notifications = await _notificationService.getNotifications(
        widget.collector.id,
        limit: 100);

    // Auto mark all unread as read in background
    for (var n in notifications) {
      if (!n.isRead) {
        _notificationService.markAsRead(n.id,
            technicianId: widget.collector.id);
      }
    }

    if (mounted) {
      setState(() {
        _notifications = notifications;
        _selectionMode = false;
        _selectedIds.clear();
        _isLoading = false;
      });
    }
  }

  Future<void> _deleteSelected() async {
    final idsToDelete = _selectedIds.toList();
    setState(() => _isLoading = true);
    await _notificationService.deleteNotifications(idsToDelete,
        technicianId: widget.collector.id);
    await _loadNotifications();
  }

  Future<void> _clearAll() async {
    setState(() => _isLoading = true);
    await _notificationService.clearAll(widget.collector.id);
    await _loadNotifications();
  }

  Future<void> _markAllRead() async {
    setState(() => _isLoading = true);
    await _notificationService.markAllAsRead(widget.collector.id);
    await _loadNotifications();
  }

  void _toggleSelection(String id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
        if (_selectedIds.isEmpty) _selectionMode = false;
      } else {
        _selectedIds.add(id);
      }
    });
  }

  void _markSingleRead(int index) {
    final notif = _notifications[index];
    if (!notif.isRead) {
      _notificationService.markAsRead(notif.id);
      setState(() {
        _notifications[index] = TechnicianNotification(
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          isRead: true,
          createdAt: notif.createdAt,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const int displayLimit = 7;
    final List<TechnicianNotification> truncatedList = _notifications.isEmpty 
        ? [] 
        : _notifications.take(displayLimit).toList();

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        backgroundColor: _selectionMode ? AppTheme.accentBlue.withValues(alpha: 0.1) : AppTheme.bgCard,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        leading: _selectionMode
            ? IconButton(
                icon: HugeIcon(icon: HugeIcons.strokeRoundedCancel01, color: AppTheme.textPrimary, size: 20.0),
                onPressed: () => setState(() {
                  _selectionMode = false;
                  _selectedIds.clear();
                }),
              )
            : IconButton(
                icon: HugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01, color: AppTheme.textPrimary, size: 20.0),
                onPressed: () => Navigator.of(context).pop(),
              ),
        title: Text(
          _selectionMode ? '${_selectedIds.length} Selected' : 'Notifications',
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary, fontSize: 16),
        ),
        actions: _selectionMode
            ? [
                IconButton(
                  icon: HugeIcon(icon: HugeIcons.strokeRoundedDelete02, color: AppTheme.accentRose, size: 20.0),
                  onPressed: _deleteSelected,
                  tooltip: 'Delete Selected',
                ),
              ]
            : [
                IconButton(
                  icon: HugeIcon(icon: HugeIcons.strokeRoundedMailOpen01, color: AppTheme.accentBlue, size: 20.0),
                  onPressed: _notifications.isEmpty ? null : _markAllRead,
                  tooltip: 'Mark All Read',
                ),
                IconButton(
                  icon: HugeIcon(icon: HugeIcons.strokeRoundedDelete04, color: AppTheme.accentRose, size: 20.0),
                  onPressed: _notifications.isEmpty ? null : _clearAll,
                  tooltip: 'Clear All',
                ),
              ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight,
                maxHeight: _isExpanded ? double.infinity : constraints.maxHeight,
              ),
              child: Column(
                children: [
                  const SizedBox(height: 8),

                  _isExpanded 
                    ? Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _isLoading
                            ? const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
                            : _notifications.isEmpty
                                ? const Center(
                                    child: Padding(
                                      padding: EdgeInsets.all(40),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          HugeIcon(icon: HugeIcons.strokeRoundedNotificationOff01, color: AppTheme.textMuted, size: 48.0),
                                          SizedBox(height: 12),
                                          Text('No notifications', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                                        ],
                                      ),
                                    ),
                                  )
                                : Column(
                                    children: [
                                      for (int index = 0; index < _notifications.length; index++)
                                        PopInBounce(
                                          delay: Duration(milliseconds: index * 60 + 50),
                                          child: _buildCompactNotificationCard(_notifications[index], index, true),
                                        ),
                                    ],
                                  ),
                      )
                    : Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: _isLoading
                              ? const Center(child: CircularProgressIndicator())
                              : _notifications.isEmpty
                                  ? const Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          HugeIcon(icon: HugeIcons.strokeRoundedNotificationOff01, color: AppTheme.textMuted, size: 48.0),
                                          SizedBox(height: 12),
                                          Text('No notifications', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                                        ],
                                      ),
                                    )
                                  : Column(
                                      children: [
                                        for (int index = 0; index < truncatedList.length; index++)
                                          Expanded(
                                            child: PopInBounce(
                                              delay: Duration(milliseconds: index * 60 + 50),
                                              child: _buildCompactNotificationCard(truncatedList[index], index, false),
                                            ),
                                          ),
                                        for (int i = 0; i < (displayLimit - truncatedList.length); i++)
                                          const Expanded(child: SizedBox.shrink()),
                                      ],
                                    ),
                        ),
                      ),

                  // View More / Less Toggle
                  if (_notifications.length > displayLimit)
                    InkWell(
                      onTap: () => setState(() => _isExpanded = !_isExpanded),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _isExpanded ? 'View Less' : 'View More',
                              style: const TextStyle(color: AppTheme.accentBlue, fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                            const SizedBox(width: 4),
                            HugeIcon(icon: _isExpanded ? HugeIcons.strokeRoundedArrowUp01 : HugeIcons.strokeRoundedArrowDown01, color: AppTheme.accentBlue, size: 16.0),
                          ],
                        ),
                      ),
                    )
                  else
                    const SizedBox(height: 12),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCompactNotificationCard(TechnicianNotification notif, int index, bool isExpanded) {
    final isSelected = _selectedIds.contains(notif.id);

    return InkWell(
      onLongPress: () {
        if (!_selectionMode) {
          setState(() {
            _selectionMode = true;
            _selectedIds.add(notif.id);
          });
        }
      },
      onTap: () {
        if (_selectionMode) {
          _toggleSelection(notif.id);
        } else {
          _markSingleRead(index);
        }
      },
      child: Container(
        margin: EdgeInsets.only(bottom: isExpanded ? 8 : 4),
        padding: EdgeInsets.symmetric(horizontal: 10, vertical: isExpanded ? 12 : 0),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppTheme.accentBlue.withValues(alpha: 0.1) 
              : (!notif.isRead ? AppTheme.bgCard : AppTheme.bgDark),
          borderRadius: BorderRadius.circular(10),
          border: isSelected 
              ? Border.all(color: AppTheme.accentBlue, width: 1.5) 
              : Border.all(color: AppTheme.border, width: 1),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (_selectionMode) ...[
              SizedBox(
                width: 20,
                height: 20,
                child: Checkbox(
                  value: isSelected,
                  onChanged: (_) => _toggleSelection(notif.id),
                  activeColor: AppTheme.accentBlue,
                ),
              ),
              const SizedBox(width: 8),
            ] else ...[
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: notif.type == 'repair' 
                      ? AppTheme.accentAmber.withValues(alpha: 0.1) 
                      : AppTheme.accentBlue.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: HugeIcon(
                  icon: notif.type == 'repair' ? HugeIcons.strokeRoundedWrench01 : HugeIcons.strokeRoundedUserAdd01,
                  color: notif.type == 'repair' ? AppTheme.accentAmber : AppTheme.accentBlue,
                  size: 18.0,
                ),
              ),
              const SizedBox(width: 14),
            ],
            
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    notif.title,
                    style: GoogleFonts.inter(
                      fontWeight: notif.isRead ? FontWeight.w500 : FontWeight.bold,
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    notif.message, 
                    style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 12),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('MMM d, yyyy • h:mm a').format(notif.createdAt),
                    style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 10),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
