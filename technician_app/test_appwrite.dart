import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> main() async {
  const String appwriteEndpoint = 'https://appwrite.springhive.co/v1';
  const String appwriteProjectId = '69c4840a0022d6824d83';
  const String appwriteApiKey = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';
  const String databaseId = 'wifi_billing_db';
  const String collectionId = 'users_profile';
  
  print('Testing Appwrite API connection...');
  
  try {
    final uri = Uri.parse('$appwriteEndpoint/databases/$databaseId/collections/$collectionId/documents');
    final res = await http.get(uri, headers: {
      'X-Appwrite-Project': appwriteProjectId,
      'X-Appwrite-Key': appwriteApiKey,
    });
    print('GET documents statusCode: ${res.statusCode}');
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      print('Documents found: ${data['documents']?.length}');
      if (data['documents']?.isNotEmpty == true) {
        final doc = data['documents'].firstWhere((d) => d['role'] == 'technician', orElse: () => data['documents'].first);
        print('Sample Doc ID: ${doc['\$id']} / Role: ${doc['role']}');
        
        // Test updating document with API key
        final patchUri = Uri.parse('$appwriteEndpoint/databases/$databaseId/collections/$collectionId/documents/${doc['\$id']}');
        final patchRes = await http.patch(patchUri, headers: {
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
          'Content-Type': 'application/json'
        }, body: jsonEncode({
          'data': {
            'profileImage': 'https://google.com/test'
          }
        }));
        print('PATCH document statusCode: ${patchRes.statusCode}');
        if (patchRes.statusCode != 200) {
          print('PATCH error: ${patchRes.body}');
        }
      }
    } else {
      print('GET error: ${res.body}');
    }
  } catch (e) {
    print('Exception caught: $e');
  }
}
