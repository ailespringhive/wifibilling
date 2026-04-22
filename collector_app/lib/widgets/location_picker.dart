import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:google_fonts/google_fonts.dart';

class LocationPicker extends StatefulWidget {
  final LatLng initialLocation;
  
  const LocationPicker({super.key, required this.initialLocation});

  @override
  _LocationPickerState createState() => _LocationPickerState();
}

class _LocationPickerState extends State<LocationPicker> {
  late LatLng _currentLocation;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _currentLocation = widget.initialLocation;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Pin Customer Location', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16)),
        backgroundColor: const Color(0xFF161622),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.check, color: Color(0xFF388E3C)),
            onPressed: () {
              Navigator.of(context).pop(_currentLocation);
            },
          ),
        ],
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: _currentLocation,
          initialZoom: 15.0,
          onPositionChanged: (position, hasGesture) {
            setState(() {
              _currentLocation = position.center;
            });
          },
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.wifibilling.technician_app',
          ),
          MarkerLayer(
            markers: [
              Marker(
                point: _currentLocation,
                width: 60,
                height: 60,
                child: const Icon(
                  Icons.location_on,
                  color: Colors.red,
                  size: 50,
                ),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF3b82f6),
        child: const Icon(Icons.my_location),
        onPressed: () {
          // In a real app we would use geolocator to get current pos.
          // For demo, we just jump to Manila coordinates
          final manila = const LatLng(14.5995, 120.9842);
          setState(() {
            _currentLocation = manila;
          });
          _mapController.move(manila, 15.0);
        },
      ),
    );
  }
}
