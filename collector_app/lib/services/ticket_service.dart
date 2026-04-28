import 'package:appwrite/appwrite.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/appwrite_config.dart';

class TicketService {
  final TablesDB _db = AppwriteService().tablesDB;

  Future<String?> createTicket(String customerId, String customerName, String customerAddress, String issue, String priority) async {
    try {
      // By default, collector-reported issues are unassigned
      await _db.createRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.repairTickets,
        rowId: ID.unique(),
        data: {
          'customerId': customerId,
          'customerName': customerName,
          'customerAddress': customerAddress,
          'technicianId': '', // unassigned
          'technicianName': 'Unassigned',
          'collectorId': 'collector-app', 
          'collectorName': 'Collector',
          'status': 'pending',
          'priority': priority,
          'issue': issue,
          'notes': 'Reported by Collector',
        },
      );
      
      // Also notify admin
      await _db.createRow(
        databaseId: appwriteDatabaseId,
        tableId: 'notifications',
        rowId: ID.unique(),
        data: {
          'technicianId': 'junril@admn.com',
          'title': 'New Issue Reported',
          'message': 'Collector reported an issue for $customerName: $issue',
          'type': 'status_update',
          'isRead': false,
        },
      );
      
      // Fetch all technicians
      try {
        final response = await _db.listRows(
          databaseId: appwriteDatabaseId,
          tableId: AppCollections.usersProfile,
          queries: [
            Query.equal('role', 'technician'),
          ],
        );

        for (var doc in response.rows) {
          final t = Map<String, dynamic>.from(doc.data as Map);
          final userId = t['userId'];
          if (userId == null || userId.toString().isEmpty) continue;

          final postUri = Uri.parse('$appwriteEndpoint/databases/$appwriteDatabaseId/collections/${AppCollections.mobileNotifications}/documents');
          
          await http.post(postUri, headers: {
            'X-Appwrite-Project': appwriteProjectId,
            'X-Appwrite-Key': appwriteApiKey,
            'Content-Type': 'application/json',
          }, body: jsonEncode({
            'documentId': 'unique()',
            'data': {
              'technicianId': doc.$id,
              'collectorId': 'collector-app', 
              'title': 'New Repair Ticket',
              'message': '$customerName reported an issue: $issue',
              'type': 'repair',
              'isRead': false,
              'createdAt': DateTime.now().toIso8601String(),
            },
            'permissions': [
              'read("user:$userId")',
              'update("user:$userId")',
              'delete("user:$userId")'
            ]
          }));
        }
      } catch (err) {
         debugPrint('Failed to fetch technicians or post notification: $err');
      }
      
      return null; // success
    } on AppwriteException catch (e) {
      debugPrint('Appwrite Error: ${e.message}');
      return e.message ?? 'Unknown Appwrite error';
    } catch (e) {
      debugPrint('Error creating repair ticket: $e');
      return e.toString();
    }
  }
}
