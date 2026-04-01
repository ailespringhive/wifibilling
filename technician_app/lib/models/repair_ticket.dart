class RepairTicket {
  final String id;
  final String customerId;
  final String customerName;
  final String customerAddress;
  final String technicianId;
  final String status; // pending, assigned, in_progress, resolved, cancelled
  final String priority; // low, medium, high
  final String issue;
  final String notes;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;

  RepairTicket({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerAddress,
    required this.technicianId,
    required this.status,
    required this.priority,
    required this.issue,
    required this.notes,
    this.latitude,
    this.longitude,
    required this.createdAt,
  });

  factory RepairTicket.fromMap(Map<String, dynamic> map) {
    return RepairTicket(
      id: map[r'$id'] ?? '',
      customerId: map['customerId'] ?? '',
      customerName: map['customerName'] ?? 'Unknown',
      customerAddress: map['customerAddress'] ?? '',
      technicianId: map['technicianId'] ?? '',
      status: map['status'] ?? 'pending',
      priority: map['priority'] ?? 'medium',
      issue: map['issue'] ?? '',
      notes: map['notes'] ?? '',
      latitude: (map['latitude'] as num?)?.toDouble(),
      longitude: (map['longitude'] as num?)?.toDouble(),
      createdAt: DateTime.tryParse(map[r'$createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  // ── Status helpers ──
  bool get isPending => status == 'pending';
  bool get isAssigned => status == 'assigned';
  bool get isInProgress => status == 'in_progress';
  bool get isResolved => status == 'resolved';
  bool get isCancelled => status == 'cancelled';

  String get statusLabel {
    switch (status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  String get priorityLabel {
    switch (priority) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      default: return priority;
    }
  }

  bool get hasLocation => latitude != null && longitude != null && latitude != 0 && longitude != 0;

  static const List<String> allStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'cancelled'];
  static const List<String> allPriorities = ['low', 'medium', 'high'];
}
