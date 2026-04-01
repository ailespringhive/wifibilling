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
    };
  }
}
