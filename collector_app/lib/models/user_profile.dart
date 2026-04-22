import 'dart:convert';
import '../config/appwrite_config.dart';

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
  final String? profileImage;
  final double? latitude;
  final double? longitude;
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
    this.profileImage,
    this.latitude,
    this.longitude,
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

  /// Parse profileImage as a list of URLs.
  /// Handles both JSON array format and legacy single-URL string.
  List<String> get locationPhotos {
    if (profileImage == null || profileImage!.isEmpty) return [];
    final trimmed = profileImage!.trim();

    String buildUrl(String item) {
      if (item.startsWith('http') || item.startsWith('data:')) return item;
      return '$appwriteEndpoint/storage/buckets/customer_images/files/$item/view?project=$appwriteProjectId';
    }

    if (trimmed.startsWith('[')) {
      try {
        final List<dynamic> decoded = jsonDecode(trimmed);
        return decoded.map((e) => buildUrl(e.toString())).where((s) => s.isNotEmpty).toList();
      } catch (_) {
        return [buildUrl(trimmed)];
      }
    }
    return [buildUrl(trimmed)];
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['\$id'] ?? json['id'] ?? '',
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
      createdAt: json['createdAt'] ?? json['\$createdAt'],
      profileImage: json['profileImage'],
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
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
      if (profileImage != null) 'profileImage': profileImage,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (wifiPort != null) 'wifiPort': wifiPort,
      if (wifiType != null) 'wifiType': wifiType,
      if (facebookUrl != null) 'facebookUrl': facebookUrl,
      if (pppoeUser != null) 'pppoeUser': pppoeUser,
      if (pppoePassword != null) 'pppoePassword': pppoePassword,
      if (wifiName != null) 'wifiName': wifiName,
      if (wifiPassword != null) 'wifiPassword': wifiPassword,
      if (billingStartDate != null) 'billingStartDate': billingStartDate,
      if (napbox != null) 'napbox': napbox,
      if (planId != null) 'planId': planId,
    };
  }
}
