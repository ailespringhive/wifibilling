import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:collector_app/main.dart';

void main() {
  testWidgets('App renders login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const CollectorApp());
    await tester.pump();

    // The app should render without errors
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
