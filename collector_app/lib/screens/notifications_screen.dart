import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../models/notification_model.dart';
import '../models/user_profile.dart';
import 'package:intl/intl.dart';

class NotificationsScreen extends StatefulWidget {
  final UserProfile collector;

  const NotificationsScreen({Key? key, required this.collector}) : super(key: key);

  @override
  _NotificationsScreenState createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();
  bool _isLoading = true;
  List<CollectorNotification> _notifications = [];

  // Paging and Selection state
  int _visibleCount = 5;
  bool _selectionMode = false;
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    final notifications = await _notificationService.getNotifications(widget.collector.id);
    
    // Auto mark all unread as read asynchronously in the background
    for (var n in notifications) {
      if (!n.isRead) {
        _notificationService.markAsRead(n.id);
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
    // Delete selected items
    final idsToDelete = _selectedIds.toList();
    setState(() => _isLoading = true);
    await _notificationService.deleteNotifications(idsToDelete);
    await _loadNotifications();
  }

  Future<void> _clearAll() async {
    setState(() => _isLoading = true);
    await _notificationService.clearAllNotifications(widget.collector.id);
    await _loadNotifications();
  }

  Future<void> _markAllRead() async {
    // Already marked during load implicitly, but we can do it explicitly
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

  @override
  Widget build(BuildContext context) {
    final visibleList = _notifications.take(_visibleCount).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: _selectionMode ? const Color(0xFF1E293B).withValues(alpha: 0.8) : const Color(0xFF1E293B),
        elevation: 0,
        leading: _selectionMode
            ? IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => setState(() {
                  _selectionMode = false;
                  _selectedIds.clear();
                }),
              )
            : IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.of(context).pop(),
              ),
        title: Text(
          _selectionMode ? '${_selectedIds.length} Selected' : 'Notifications',
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: _selectionMode
            ? [
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                  onPressed: _deleteSelected,
                  tooltip: 'Delete Selected',
                ),
              ]
            : [
                IconButton(
                  icon: const Icon(Icons.mark_email_read_outlined, color: Colors.blueAccent),
                  onPressed: _notifications.isEmpty ? null : _markAllRead,
                  tooltip: 'Mark All Read',
                ),
                IconButton(
                  icon: const Icon(Icons.delete_sweep_outlined, color: Colors.redAccent),
                  onPressed: _notifications.isEmpty ? null : _clearAll,
                  tooltip: 'Clear All',
                ),
              ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                       Icon(Icons.notifications_off_outlined, size: 64, color: Colors.grey),
                       SizedBox(height: 16),
                       Text('No notifications', style: TextStyle(color: Colors.grey, fontSize: 18)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: visibleList.length + 1,
                    itemBuilder: (context, index) {
                      if (index == visibleList.length) {
                        return _buildLoadMoreRow();
                      }

                      final notif = visibleList[index];
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
                          }
                        },
                        child: Card(
                          color: isSelected ? const Color(0xFF334155) : const Color(0xFF1E293B),
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: isSelected ? const BorderSide(color: Colors.blueAccent, width: 1.5) : BorderSide.none,
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            leading: _selectionMode
                                ? Checkbox(
                                    value: isSelected,
                                    onChanged: (_) => _toggleSelection(notif.id),
                                    activeColor: Colors.blueAccent,
                                  )
                                : CircleAvatar(
                                    backgroundColor: notif.type == 'assignment'
                                        ? Colors.blue.withValues(alpha: 0.2)
                                        : Colors.orange.withValues(alpha: 0.2),
                                    child: Icon(
                                      notif.type == 'assignment' ? Icons.person_add : Icons.update,
                                      color: notif.type == 'assignment' ? Colors.blue : Colors.orange,
                                    ),
                                  ),
                            title: Text(
                              notif.title,
                              style: TextStyle(
                                fontWeight: notif.isRead ? FontWeight.normal : FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 6),
                                Text(notif.message, style: TextStyle(color: Colors.grey[400])),
                                const SizedBox(height: 8),
                                Text(
                                  DateFormat('MMM d, yyyy • h:mm a').format(notif.createdAt),
                                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  Widget _buildLoadMoreRow() {
    if (_notifications.isEmpty) return const SizedBox.shrink();

    final canShowMore = _visibleCount < _notifications.length;
    final canShowLess = _visibleCount > 5;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (canShowLess)
          TextButton.icon(
            onPressed: () => setState(() => _visibleCount = (_visibleCount - 5 < 5) ? 5 : _visibleCount - 5),
            icon: const Icon(Icons.expand_less, color: Colors.grey),
            label: const Text('View Less', style: TextStyle(color: Colors.grey)),
          ),
        if (canShowLess && canShowMore) const SizedBox(width: 16),
        if (canShowMore)
          TextButton.icon(
            onPressed: () => setState(() => _visibleCount += 10),
            icon: const Icon(Icons.expand_more, color: Colors.blueAccent),
            label: const Text('View More', style: TextStyle(color: Colors.blueAccent)),
          ),
      ],
    );
  }
}
