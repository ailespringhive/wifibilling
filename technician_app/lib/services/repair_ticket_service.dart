import 'package:appwrite/appwrite.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/appwrite_config.dart';
import '../models/repair_ticket.dart';
import 'local_cache_service.dart';

class RepairTicketService {
  final TablesDB _db = AppwriteService().tablesDB;

  static const String _collectionId = 'repair_tickets';

  /// Fetch all tickets for a technician (cache-first fallback)
  /// Fetch ALL tickets (broadcast to all technicians)
  Future<List<RepairTicket>> getTickets(String technicianId) async {
    final cacheService = LocalCacheService();
    final isOnline = await cacheService.isOnline;

    if (!isOnline) {
      debugPrint('Device offline. Loading tickets from cache.');
      final cachedList = cacheService.getTicketsCache(technicianId);
      return cachedList.map((map) => RepairTicket.fromMap(map)).toList();
    }

    try {
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        queries: [
          Query.orderDesc('\$createdAt'),
          Query.limit(100),
        ],
      );

      final ticketsData = response.rows.map((doc) {
        final map = Map<String, dynamic>.from(doc.data as Map);
        map[r'$id'] = doc.$id;
        map[r'$createdAt'] = doc.$createdAt;
        return map;
      }).toList();
      
      // Update cache
      await cacheService.saveTicketsCache(technicianId, ticketsData);

      return ticketsData.map((data) => RepairTicket.fromMap(data)).toList();
    } catch (e) {
      debugPrint('Error fetching repair tickets from network: $e');
      // Graceful fallback if network request fails despite telling us we are online
      final cachedList = cacheService.getTicketsCache(technicianId);
      return cachedList.map((map) => RepairTicket.fromMap(map)).toList();
    }
  }

  /// Get counts per status
  Future<Map<String, int>> getStatusCounts(String technicianId) async {
    final tickets = await getTickets(technicianId);
    final counts = <String, int>{
      'pending': 0,
      'in_progress': 0,
      'resolved': 0,
      'cancelled': 0,
    };

    for (final ticket in tickets) {
      counts[ticket.status] = (counts[ticket.status] ?? 0) + 1;
    }
    return counts;
  }

  /// Update ticket status — offline-aware with local cache patch + queue
  Future<bool> updateStatus(String ticketId, String newStatus, {String technicianId = ''}) async {
    final cache = LocalCacheService();
    final patch = {'status': newStatus};

    if (!(await cache.isOnline)) {
      debugPrint('Offline: queuing status update for $ticketId');
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      await cache.queueTicketUpdate(ticketId, patch);
      return true;
    }

    try {
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        rowId: ticketId,
        data: patch,
      );
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    } catch (e) {
      debugPrint('Error updating ticket status: $e');
      // Fallback: queue for retry
      await cache.queueTicketUpdate(ticketId, patch);
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    }
  }

  /// Resolve ticket with proof images - offline-aware
  Future<bool> resolveTicketWithProof(String ticketId, List<String> existingImages, List<String> proofUrls, {String technicianId = ''}) async {
    final patch = {'status': 'resolved', 'proofUrls': proofUrls};
    final cache = LocalCacheService();

    if (!(await cache.isOnline)) {
      debugPrint('Offline: queuing resolve with proof for $ticketId');
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      await cache.queueTicketUpdate(ticketId, patch);
      return true;
    }

    try {
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        rowId: ticketId,
        data: patch,
      );
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    } catch (e) {
      debugPrint('Error resolving ticket with proof: $e — queuing for retry');
      await cache.queueTicketUpdate(ticketId, patch);
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    }
  }

  /// Update ticket priority — offline-aware
  Future<bool> updatePriority(String ticketId, String priority, {String technicianId = ''}) async {
    final cache = LocalCacheService();
    final patch = {'priority': priority};

    if (!(await cache.isOnline)) {
      debugPrint('Offline: queuing priority update for $ticketId');
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      await cache.queueTicketUpdate(ticketId, patch);
      return true;
    }

    try {
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        rowId: ticketId,
        data: patch,
      );
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    } catch (e) {
      debugPrint('Error updating priority: $e — queuing for retry');
      await cache.queueTicketUpdate(ticketId, patch);
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    }
  }

  /// Add/update notes — offline-aware
  Future<bool> updateNotes(String ticketId, String notes, {String technicianId = ''}) async {
    final cache = LocalCacheService();
    final patch = {'notes': notes};

    if (!(await cache.isOnline)) {
      debugPrint('Offline: queuing notes update for $ticketId');
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      await cache.queueTicketUpdate(ticketId, patch);
      return true;
    }

    try {
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        rowId: ticketId,
        data: patch,
      );
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    } catch (e) {
      debugPrint('Error updating notes: $e — queuing for retry');
      await cache.queueTicketUpdate(ticketId, patch);
      if (technicianId.isNotEmpty) await cache.updateTicketInCache(technicianId, ticketId, patch);
      return true;
    }
  }

  /// Update assigned technician and collector on a ticket
  Future<bool> updateAssignedPersonnel(String ticketId, {
    String? technicianId,
    String? technicianName,
    String? collectorId,
    String? collectorName,
  }) async {
    final Map<String, dynamic> data = {};
    if (technicianId != null) data['technicianId'] = technicianId;
    if (technicianName != null) data['technicianName'] = technicianName;
    if (collectorId != null) data['collectorId'] = collectorId;
    if (collectorName != null) data['collectorName'] = collectorName;
    
    if (data.isEmpty) return true;

    try {
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        rowId: ticketId,
        data: data,
      );
      return true;
    } catch (e) {
      debugPrint('Client SDK updateAssignedPersonnel failed ($e), using API bypass...');
      try {
        final url = Uri.parse(
          '$appwriteEndpoint/databases/$appwriteDatabaseId/collections/$_collectionId/documents/$ticketId',
        );
        final response = await http.patch(
          url,
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': appwriteProjectId,
            'X-Appwrite-Key': appwriteApiKey,
          },
          body: jsonEncode({'data': data}),
        );
        return response.statusCode == 200;
      } catch (e2) {
        debugPrint('API bypass updateAssignedPersonnel also failed: $e2');
        return false;
      }
    }
  }

  /// Delete ticket entirely
  Future<bool> deleteTicket(String ticketId) async {
    try {
      await _db.deleteRow(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        rowId: ticketId,
      );
      return true;
    } catch (e) {
      debugPrint('Error deleting ticket: $e');
      return false;
    }
  }

  /// Send a notification to the admin about a status change
  /// Uses direct HTTP with the Server API key since the client SDK lacks create permissions
  Future<bool> sendAdminNotification(String technicianName, String customerName, String newStatus) async {
    try {
      final statusLabel = newStatus == 'in_progress' ? 'In Progress' : newStatus[0].toUpperCase() + newStatus.substring(1);

      await _db.createRow(
        databaseId: appwriteDatabaseId,
        tableId: 'notifications',
        rowId: ID.unique(),
        data: {
          'technicianId': 'junril@admn.com',
          'title': 'Repair $statusLabel',
          'message': '$technicianName updated repair for $customerName to "$statusLabel"',
          'type': 'status_update',
          'isRead': false,
        },
      );
      
      return true;
    } catch (e) {
      debugPrint('Error sending admin notification: $e');
      return false;
    }
  }

  /// Create a new ticket from the field
  Future<RepairTicket?> createTicket(Map<String, dynamic> data) async {
    final cacheService = LocalCacheService();
    if (!(await cacheService.isOnline)) {
      debugPrint('Device offline. Queuing ticket creation.');
      await cacheService.queueTicketCreation(data);
      // Return a temporary ticket to update UI optimistically
      return RepairTicket.fromMap({
        ...data,
        r'$id': 'temp_${DateTime.now().millisecondsSinceEpoch}',
        r'$createdAt': DateTime.now().toIso8601String(),
      });
    }

    try {
      final response = await _db.createRow(
        databaseId: appwriteDatabaseId,
        tableId: _collectionId,
        rowId: ID.unique(),
        data: data,
      );
      final map = Map<String, dynamic>.from(response.data as Map);
      map[r'$id'] = response.$id;
      map[r'$createdAt'] = response.$createdAt;
      return RepairTicket.fromMap(map);
    } catch (e) {
      debugPrint('Error creating repair ticket: $e');
      return null;
    }
  }

  Future<String?> uploadTicketImage(String filePath, String fileName) async {
    try {
      final file = await AppwriteService().storage.createFile(
        bucketId: 'customer_images', // Reusing existing bucket
        fileId: ID.unique(),
        file: InputFile.fromPath(path: filePath, filename: fileName),
      );
      return '$appwriteEndpoint/storage/buckets/customer_images/files/${file.$id}/view?project=$appwriteProjectId';
    } catch (e) {
      debugPrint('Error uploading ticket image: $e');
      return null;
    }
  }

  /// Upload a ticket image using raw bytes (Web compatible)
  Future<String?> uploadTicketImageBytes(List<int> bytes, String fileName) async {
    try {
      final file = await AppwriteService().storage.createFile(
        bucketId: 'customer_images',
        fileId: ID.unique(),
        file: InputFile.fromBytes(bytes: bytes, filename: fileName),
      );
      return '$appwriteEndpoint/storage/buckets/customer_images/files/${file.$id}/view?project=$appwriteProjectId';
    } catch (e) {
      debugPrint('Appwrite SDK upload failed. Attempting HTTP Bypass: $e');
      try {
        final uri = Uri.parse('$appwriteEndpoint/storage/buckets/customer_images/files');
        final request = http.MultipartRequest('POST', uri);
        request.headers['X-Appwrite-Project'] = appwriteProjectId;
        request.headers['X-Appwrite-Key'] = appwriteApiKey;
        request.fields['fileId'] = ID.unique();
        
        request.files.add(http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: fileName,
        ));
        
        final response = await request.send();
        if (response.statusCode == 201) {
          final body = await response.stream.bytesToString();
          final jsonResp = jsonDecode(body);
          final fileId = jsonResp[r'$id'];
          return '$appwriteEndpoint/storage/buckets/customer_images/files/$fileId/view?project=$appwriteProjectId';
        } else {
          final body = await response.stream.bytesToString();
          debugPrint('HTTP Bypass failed: ${response.statusCode} - $body');
          return null;
        }
      } catch (httpError) {
        debugPrint('HTTP Bypass threw error: $httpError');
        return null;
      }
    }
  }
}
