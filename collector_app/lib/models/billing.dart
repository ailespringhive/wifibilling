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
  bool get isPendingConfirmation => paymentStatus == 'payment_confirmation';

  String get statusLabel {
    switch (paymentStatus) {
      case 'not_yet_paid':
        return 'Not Yet Paid';
      case 'already_paid':
        return 'Already Paid';
      case 'payment_confirmation':
        return 'Payment Confirmation';
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
}
