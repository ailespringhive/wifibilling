import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Generate Technician Logo', (WidgetTester tester) async {
    // Set surface size
    await tester.binding.setSurfaceSize(const Size(512, 512));

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Container(
          width: 512,
          height: 512,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(112),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFa855f7), // Purple light
                Color(0xFF312e81), // Dark blue
              ],
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Wifi Icon
              const Icon(
                Icons.wifi,
                size: 240,
                color: Colors.white,
              ),
              // Wrench Badge
              Positioned(
                bottom: 150,
                right: 150,
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFF1e1b4b), // Very dark blue/purple background
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.build, // Wrench
                    color: Color(0xFFa855f7),
                    size: 32,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // Matches golden file to overwrite the assets/icon.png
    await expectLater(
      find.byType(Container).first,
      matchesGoldenFile('../assets/icon.png'),
    );
  });
}
