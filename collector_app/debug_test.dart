import 'package:appwrite/appwrite.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() async {
  final String appwriteEndpoint = 'https://appwrite.springhive.co/v1';
  final String appwriteProjectId = '69c4840a0022d6824d83';
  final String appwriteDatabaseId = 'wifi_billing_db';
  final String appwriteApiKey = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';

  Client client = Client()
    ..setEndpoint(appwriteEndpoint)
    ..setProject(appwriteProjectId)
    ..setSelfSigned(status: true);

  Databases db = Databases(client);

  try {
    print('Testing create ticket...');
    await db.createDocument(
      databaseId: appwriteDatabaseId,
      collectionId: 'repair_tickets',
      documentId: ID.unique(),
      data: {
        'customerId': 'test',
        'customerName': 'test name',
        'customerAddress': 'test addr',
        'technicianId': '',
        'technicianName': 'Unassigned',
        'collectorId': 'collector-app', 
        'collectorName': 'Collector',
        'status': 'pending',
        'priority': 'medium',
        'issue': 'Test Issue',
        'notes': 'Reported by Collector',
        'imageUrls': [],
      },
    );
    print('Ticket created in DB cleanly!');
  } catch (e) {
    print('DB Error Object: $e');
  }

  print('Testing raw HTTP bypass for notifications...');
  final fetchUri = Uri.parse('$appwriteEndpoint/databases/$appwriteDatabaseId/collections/users_profile/documents?queries[]=equal("role", ["technician"])');
  final bypassRes = await http.get(fetchUri, headers: {
    'X-Appwrite-Project': appwriteProjectId,
    'X-Appwrite-Key': appwriteApiKey,
  });

  if (bypassRes.statusCode == 200) {
    print('Bypass fetched!');
    final decoded = jsonDecode(bypassRes.body);
    final documents = decoded['documents'] as List<dynamic>;

    for (var t in documents) {
      final postUri = Uri.parse('$appwriteEndpoint/databases/$appwriteDatabaseId/collections/mobile_notifications/documents');
      
      final postRes = await http.post(postUri, headers: {
        'X-Appwrite-Project': appwriteProjectId,
        'X-Appwrite-Key': appwriteApiKey,
        'Content-Type': 'application/json',
      }, body: jsonEncode({
        'documentId': 'unique()',
        'data': {
          'technicianId': t['userId'],
          'collectorId': 'collector-app', 
          'title': 'New Repair Ticket',
          'message': 'Test message',
          'type': 'repair',
          'isRead': false,
        }
      }));
      print('Post notification status: ${postRes.statusCode}');
      if (postRes.statusCode != 201) {
        print('Post notification error: ${postRes.body}');
      }
    }
  } else {
    print('Failed to fetch bypass: ${bypassRes.body}');
  }
}
