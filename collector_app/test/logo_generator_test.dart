import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Generate Collector Logo', (WidgetTester tester) async {
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
                Color(0xFF4ade80), // Teal/Green light
                Color(0xFF0f766e), // Teal dark
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
              // Peso Badge
              Positioned(
                bottom: 150,
                right: 150,
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFF064e3b), // Dark teal background
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    '₱',
                    style: TextStyle(
                      color: Color(0xFF4ade80),
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    await expectLater(
      find.byType(Container).first,
      matchesGoldenFile('../assets/icon.png'),
    );
  });
}
