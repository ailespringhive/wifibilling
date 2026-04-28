import 'package:flutter_map/flutter_map.dart';
import 'package:flutter/material.dart';

void test() {
  TileLayer(
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    userAgentPackageName: 'com.wifibilling.technician_app',
    tileProvider: NetworkTileProvider(
      headers: const {'User-Agent': 'WiFiBillingApp/1.0.0 (admin@springhive.com)'},
    ),
  );
}
