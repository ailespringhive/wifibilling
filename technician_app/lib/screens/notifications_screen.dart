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
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _currentPage = 0;
  final int _pageSize = 10;
  List<TechnicianNotification> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications({bool loadMore = false}) async {
    if (loadMore) {
      setState(() => _isLoadingMore = true);
    } else {
      setState(() {
        _isLoading = true;
        _currentPage = 0;
        _hasMore = true;
      });
    }

    final newNotifications = await _notificationService.getNotifications(
      widget.collector.id, 
      limit: _pageSize, 
      offset: _currentPage * _pageSize
    );
    
    // Auto mark all unread as read asynchronously in the background
    for (var n in newNotifications) {
      if (!n.isRead) {
        _notificationService.markAsRead(n.id);
      }
    }

    if (mounted) {
      setState(() {
        if (loadMore) {
          _notifications.addAll(newNotifications);
          _isLoadingMore = false;
        } else {
          _notifications = newNotifications;
          _isLoading = false;
        }
        
        if (newNotifications.length < _pageSize) {
          _hasMore = false;
        } else {
          _currentPage++;
        }
      });
    }
  }

  Future<void> _markAllAsRead() async {
    await _notificationService.markAllAsRead(widget.collector.id);
    _loadNotifications();
  }

  Future<void> _clearAll() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Clear All', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to permanently delete all notifications?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Clear', style: TextStyle(color: Colors.red))),
        ],
      )
    );
    
    if (confirm == true) {
      setState(() => _isLoading = true);
      await _notificationService.clearAll(widget.collector.id);
      _loadNotifications();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all, color: Colors.blueAccent),
            tooltip: 'Mark All Read',
            onPressed: _markAllAsRead,
          ),
          IconButton(
            icon: const Icon(Icons.delete_sweep, color: Colors.redAccent),
            tooltip: 'Clear All',
            onPressed: _clearAll,
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
              )
            )
          : RefreshIndicator(
              onRefresh: _loadNotifications,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _notifications.length + (_hasMore ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _notifications.length) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Center(
                        child: _isLoadingMore
                            ? const CircularProgressIndicator()
                            : TextButton(
                                onPressed: () => _loadNotifications(loadMore: true),
                                child: const Text('View More', style: TextStyle(fontSize: 16)),
                              ),
                      ),
                    );
                  }

                  final notif = _notifications[index];
                  return Card(
                    color: const Color(0xFF1E293B),
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      leading: CircleAvatar(
                        backgroundColor: notif.type == 'assignment' 
                            ? Colors.blue.withOpacity(0.2) 
                            : Colors.orange.withOpacity(0.2),
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
                        )
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 6),
                          Text(notif.message, style: TextStyle(color: Colors.grey[400])),
                          const SizedBox(height: 8),
                          Text(
                            DateFormat('MMM d, yyyy • h:mm a').format(notif.createdAt.toLocal()), 
                            style: TextStyle(color: Colors.grey[600], fontSize: 12)
                          ),
                        ],
                      ),
                    )
                  );
                },
              ),
            ),
    );
  }
}
