class CollectorNotification {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  CollectorNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });

  factory CollectorNotification.fromMap(Map<String, dynamic> map) {
    return CollectorNotification(
      id: map[r'$id'] ?? '',
      title: map['title'] ?? '',
      message: map['message'] ?? '',
      type: map['type'] ?? 'info',
      isRead: map['isRead'] == true,
      createdAt: DateTime.tryParse(map['createdAt'] ?? map[r'$createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
