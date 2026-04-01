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
        _isLoading = false;
      });
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
                itemCount: _notifications.length,
                itemBuilder: (context, index) {
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
                            DateFormat('MMM d, yyyy • h:mm a').format(notif.createdAt), 
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
