class UserProfile {
  final String id;
  final String userId;
  final String firstName;
  final String lastName;
  final String middleName;
  final String phone;
  final String email;
  final String address;
  final String barangay;
  final String city;
  final String province;
  final String role;
  final String? createdAt;
  final double? latitude;
  final double? longitude;
  final String? profileImage;
  final String? wifiPort;
  final String? wifiType;
  final String? facebookUrl;
  final String? pppoeUser;
  final String? pppoePassword;
  final String? wifiName;
  final String? wifiPassword;
  final String? billingStartDate;
  final String? napbox;
  final String? planId;
  final String? status;

  UserProfile({
    required this.id,
    required this.userId,
    required this.firstName,
    required this.lastName,
    this.middleName = '',
    this.phone = '',
    this.email = '',
    this.address = '',
    this.barangay = '',
    this.city = '',
    this.province = '',
    required this.role,
    this.createdAt,
    this.latitude,
    this.longitude,
    this.profileImage,
    this.wifiPort,
    this.wifiType,
    this.facebookUrl,
    this.pppoeUser,
    this.pppoePassword,
    this.wifiName,
    this.wifiPassword,
    this.billingStartDate,
    this.napbox,
    this.planId,
    this.status,
  });

  String get fullName => '$firstName $lastName'.trim();

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final l = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$f$l';
  }

  String get locationString {
    final parts = <String>[];
    if (barangay.isNotEmpty) parts.add(barangay);
    if (city.isNotEmpty) parts.add(city);
    if (province.isNotEmpty) parts.add(province);
    return parts.join(', ');
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json[r'$id'] ?? json['id'] ?? '',
      userId: json['userId'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      middleName: json['middleName'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      address: json['address'] ?? '',
      barangay: json['barangay'] ?? '',
      city: json['city'] ?? '',
      province: json['province'] ?? '',
      role: json['role'] ?? '',
      createdAt: json['createdAt'] ?? json[r'$createdAt'],
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      profileImage: json['profileImage'],
      wifiPort: json['wifiPort'],
      wifiType: json['wifiType'],
      facebookUrl: json['facebookUrl'],
      pppoeUser: json['pppoeUser'],
      pppoePassword: json['pppoePassword'],
      wifiName: json['wifiName'],
      wifiPassword: json['wifiPassword'],
      billingStartDate: json['billingStartDate'],
      napbox: json['napbox'],
      planId: json['planId'],
      status: json['status'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'firstName': firstName,
      'lastName': lastName,
      'middleName': middleName,
      'phone': phone,
      'email': email,
      'address': address,
      'barangay': barangay,
      'city': city,
      'province': province,
      'role': role,
      'createdAt': createdAt,
      'latitude': latitude,
      'longitude': longitude,
      'profileImage': profileImage,
      'wifiPort': wifiPort,
      'wifiType': wifiType,
      'facebookUrl': facebookUrl,
      'pppoeUser': pppoeUser,
      'pppoePassword': pppoePassword,
      'wifiName': wifiName,
      'wifiPassword': wifiPassword,
      'billingStartDate': billingStartDate,
      'napbox': napbox,
      'planId': planId,
      'status': status,
    };
  }
}
