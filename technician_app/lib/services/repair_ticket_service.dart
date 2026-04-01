import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../models/repair_ticket.dart';

class RepairTicketService {
  final Databases _databases = AppwriteService().databases;

  static const String _collectionId = 'repair_tickets';

  /// Fetch all tickets for a technician
  Future<List<RepairTicket>> getTickets(String technicianId) async {
    try {
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: _collectionId,
        queries: [
          Query.equal('technicianId', technicianId),
          Query.orderDesc('\$createdAt'),
          Query.limit(100),
        ],
      );

      return response.documents
          .map((doc) => RepairTicket.fromMap(doc.data))
          .toList();
    } catch (e) {
      print('Error fetching repair tickets: $e');
      return [];
    }
  }

  /// Get counts per status
  Future<Map<String, int>> getStatusCounts(String technicianId) async {
    final tickets = await getTickets(technicianId);
    final counts = <String, int>{
      'pending': 0,
      'assigned': 0,
      'in_progress': 0,
      'resolved': 0,
      'cancelled': 0,
    };

    for (final ticket in tickets) {
      counts[ticket.status] = (counts[ticket.status] ?? 0) + 1;
    }
    return counts;
  }

  /// Update ticket status
  Future<bool> updateStatus(String ticketId, String newStatus) async {
    try {
      await _databases.updateDocument(
        databaseId: appwriteDatabaseId,
        collectionId: _collectionId,
        documentId: ticketId,
        data: {'status': newStatus},
      );
      return true;
    } catch (e) {
      print('Error updating ticket status: $e');
      return false;
    }
  }

  /// Update ticket priority
  Future<bool> updatePriority(String ticketId, String priority) async {
    try {
      await _databases.updateDocument(
        databaseId: appwriteDatabaseId,
        collectionId: _collectionId,
        documentId: ticketId,
        data: {'priority': priority},
      );
      return true;
    } catch (e) {
      print('Error updating ticket priority: $e');
      return false;
    }
  }

  /// Add/update notes
  Future<bool> updateNotes(String ticketId, String notes) async {
    try {
      await _databases.updateDocument(
        databaseId: appwriteDatabaseId,
        collectionId: _collectionId,
        documentId: ticketId,
        data: {'notes': notes},
      );
      return true;
    } catch (e) {
      print('Error updating ticket notes: $e');
      return false;
    }
  }

  /// Delete ticket entirely
  Future<bool> deleteTicket(String ticketId) async {
    try {
      await _databases.deleteDocument(
        databaseId: appwriteDatabaseId,
        collectionId: _collectionId,
        documentId: ticketId,
      );
      return true;
    } catch (e) {
      print('Error deleting ticket: $e');
      return false;
    }
  }

  /// Send a notification to the admin about a status change
  /// Uses direct HTTP with the Server API key since the client SDK lacks create permissions
  Future<bool> sendAdminNotification(String technicianName, String customerName, String newStatus) async {
    try {
      final statusLabel = newStatus == 'in_progress' ? 'In Progress' : newStatus[0].toUpperCase() + newStatus.substring(1);

      await _databases.createDocument(
        databaseId: appwriteDatabaseId,
        collectionId: 'notifications',
        documentId: ID.unique(),
        data: {
          'technicianId': 'admin@wifibilling.com',
          'title': 'Repair $statusLabel',
          'message': '$technicianName updated repair for $customerName to "$statusLabel"',
          'type': 'status_update',
          'isRead': false,
        },
      );
      
      return true;
    } catch (e) {
      print('Error sending admin notification: $e');
      return false;
    }
  }
}
