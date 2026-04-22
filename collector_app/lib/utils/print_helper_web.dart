// ignore: avoid_web_libraries_in_flutter
import 'dart:js_interop';

@JS()
external void eval(String code);

void printReceiptHtml(String html) {
  final escaped = html
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'")
      .replaceAll('\n', '\\n');

  eval("var w = window.open('', '_blank'); w.document.write('$escaped'); w.document.close(); w.print();");
}
