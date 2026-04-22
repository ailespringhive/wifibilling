class Billing {
  final String id;
  final String customerId;
  final String subscriptionId;
  final String billingMonth;
  final double amount;
  final String paymentStatus;
  final String? dueDate;
  final String? paidDate;
  final String? collectedBy;
  final String notes;
  final String? customerName;
  final String? createdAt;
  final double? amountPaid;

  Billing({
    required this.id,
    required this.customerId,
    this.subscriptionId = '',
    required this.billingMonth,
    required this.amount,
    required this.paymentStatus,
    this.dueDate,
    this.paidDate,
    this.collectedBy,
    this.notes = '',
    this.customerName,
    this.createdAt,
    this.amountPaid,
  });

  bool get isPaid => paymentStatus == 'already_paid';
  bool get isUnpaid => paymentStatus == 'not_yet_paid';
  bool get isOverdue => paymentStatus == 'overdue';

  String get statusLabel {
    switch (paymentStatus) {
      case 'not_yet_paid':
        return 'Not Yet Paid';
      case 'already_paid':
        return 'Already Paid';
      case 'overdue':
        return 'Overdue';
      default:
        return paymentStatus;
    }
  }

  factory Billing.fromJson(Map<String, dynamic> json) {
    return Billing(
      id: json['\$id'] ?? json['id'] ?? '',
      customerId: json['customerId'] ?? '',
      subscriptionId: json['subscriptionId'] ?? '',
      billingMonth: json['billingMonth'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      paymentStatus: json['paymentStatus'] ?? 'not_yet_paid',
      dueDate: json['dueDate'],
      paidDate: json['paidDate'],
      collectedBy: json['collectedBy'],
      notes: json['notes'] ?? '',
      customerName: json['customerName'],
      createdAt: json['createdAt'] ?? json['\$createdAt'],
      amountPaid: json['amountPaid'] != null ? (json['amountPaid'] as num).toDouble() : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'customerId': customerId,
      'subscriptionId': subscriptionId,
      'billingMonth': billingMonth,
      'amount': amount,
      'paymentStatus': paymentStatus,
      'dueDate': dueDate,
      'paidDate': paidDate,
      'collectedBy': collectedBy,
      'notes': notes,
      'customerName': customerName,
      if (amountPaid != null) 'amountPaid': amountPaid,
    };
  }

  Billing copyWith({
    String? paymentStatus,
  }) {
    return Billing(
      id: this.id,
      customerId: this.customerId,
      subscriptionId: this.subscriptionId,
      billingMonth: this.billingMonth,
      amount: this.amount,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      dueDate: this.dueDate,
      paidDate: this.paidDate,
      collectedBy: this.collectedBy,
      notes: this.notes,
      customerName: this.customerName,
      createdAt: this.createdAt,
      amountPaid: this.amountPaid,
    );
  }
}
