class SubscriptionModel {
  final String id;
  final String customerId;
  final String planId;
  final String collectorId;
  final String status;
  final String? startDate;

  SubscriptionModel({
    required this.id,
    required this.customerId,
    required this.planId,
    this.collectorId = '',
    required this.status,
    this.startDate,
  });

  bool get isActive => status == 'active';

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionModel(
      id: json['\$id'] ?? json['id'] ?? '',
      customerId: json['customerId'] ?? '',
      planId: json['planId'] ?? '',
      collectorId: json['collectorId'] ?? '',
      status: json['status'] ?? '',
      startDate: json['startDate'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'customerId': customerId,
      'planId': planId,
      'collectorId': collectorId,
      'status': status,
      'startDate': startDate,
    };
  }
}
