import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/auth_service.dart';
import '../services/repair_ticket_service.dart';
import '../models/repair_ticket.dart';
import '../theme/app_theme.dart';

/// Full-page list of all tickets with search and filtering
class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key});

  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  final RepairTicketService _ticketService = RepairTicketService();
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<RepairTicket> _allTickets = [];
  String _filterStatus = 'all';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTickets() async {
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();
    final techId = auth.collectorId;

    try {
      final tickets = await _ticketService.getTickets(techId);
      setState(() {
        _allTickets = tickets;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<RepairTicket> get _filteredTickets {
    var list = _allTickets;
    if (_filterStatus != 'all') {
      list = list.where((t) => t.status == _filterStatus).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((t) =>
          t.customerName.toLowerCase().contains(q) ||
          t.customerAddress.toLowerCase().contains(q) ||
          t.issue.toLowerCase().contains(q)
      ).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: TextField(
            controller: _searchController,
            onChanged: (v) => setState(() => _searchQuery = v),
            style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'Search tickets...',
              hintStyle: GoogleFonts.inter(color: AppTheme.textMuted),
              prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted, size: 20),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: AppTheme.textMuted, size: 20),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor: AppTheme.bgCard,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.accentBlue),
              ),
            ),
          ),
        ),

        // Filter chips
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildChip('all', 'All', null),
                _buildChip('pending', 'Pending', AppTheme.accentAmber),
                _buildChip('in_progress', 'In Progress', AppTheme.accentBlue),
                _buildChip('resolved', 'Resolved', AppTheme.accentEmerald),
                _buildChip('cancelled', 'Cancelled', AppTheme.accentRose),
              ],
            ),
          ),
        ),

        // List
        Expanded(
          child: _isLoading
              ? _buildShimmer()
              : _filteredTickets.isEmpty
                  ? _buildEmpty()
                  : RefreshIndicator(
                      color: AppTheme.accentBlue,
                      backgroundColor: AppTheme.bgCard,
                      onRefresh: _loadTickets,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                        itemCount: _filteredTickets.length,
                        itemBuilder: (context, index) => _buildTicketItem(_filteredTickets[index]),
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildChip(String key, String label, Color? color) {
    final isActive = _filterStatus == key;
    final chipColor = color ?? AppTheme.accentBlue;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _filterStatus = key),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: isActive ? chipColor.withValues(alpha: 0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: isActive ? chipColor : AppTheme.border),
          ),
          child: Text(
            label,
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: isActive ? chipColor : AppTheme.textMuted),
          ),
        ),
      ),
    );
  }

  Widget _buildTicketItem(RepairTicket ticket) {
    final statusColor = _statusColor(ticket.status);
    final priorityColor = _priorityColor(ticket.priority);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: AppTheme.glassCard(radius: 14),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _showTicketDetail(ticket),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                // Top row: icon + name + priority
                Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.build_circle_outlined, color: statusColor, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ticket.customerName,
                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(ticket.statusLabel, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: statusColor)),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  ticket.issue,
                                  style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                                  maxLines: 1, overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: priorityColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(ticket.priorityLabel, style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, color: priorityColor)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showTicketDetail(RepairTicket ticket) {
    String selectedStatus = ticket.status;
    String selectedPriority = ticket.priority;
    final notesCtrl = TextEditingController(text: ticket.notes);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(top: BorderSide(color: AppTheme.border)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    width: 40, height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.textMuted.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: Row(
                      children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: _statusColor(ticket.status).withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.build_circle_outlined, color: _statusColor(ticket.status), size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Repair Ticket', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                              Text(ticket.customerName, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted)),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (c) => AlertDialog(
                                backgroundColor: AppTheme.bgCard,
                                title: Text('Clear Ticket?', style: GoogleFonts.inter(color: AppTheme.textPrimary)),
                                content: Text('Are you sure you want to clear/delete this ticket? It will be removed from the list.', style: GoogleFonts.inter(color: AppTheme.textMuted)),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(c, false), child: Text('Cancel', style: GoogleFonts.inter(color: AppTheme.textMuted))),
                                  TextButton(
                                    onPressed: () => Navigator.pop(c, true),
                                    child: Text('Clear', style: GoogleFonts.inter(color: AppTheme.accentRose, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            );
                            if (confirm == true) {
                              await _ticketService.deleteTicket(ticket.id);
                              if (context.mounted) {
                                Navigator.pop(ctx); // close bottom sheet
                                _loadTickets();     // refresh list
                              }
                            }
                          },
                          icon: const Icon(Icons.delete_outline, color: AppTheme.accentRose),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const Divider(color: AppTheme.border, height: 24),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _sheetSection('Customer', ticket.customerName),
                          _sheetSection('Address', ticket.customerAddress.isNotEmpty ? ticket.customerAddress : 'Not provided'),
                          _sheetSection('Issue', ticket.issue.isNotEmpty ? ticket.issue : 'No description'),
                          const SizedBox(height: 16),
                          if (ticket.hasLocation)
                            Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(bottom: 16),
                              height: 150,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Stack(
                                  children: [
                                    FlutterMap(
                                      options: MapOptions(
                                        initialCenter: LatLng(ticket.latitude!, ticket.longitude!),
                                        initialZoom: 15,
                                        interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
                                      ),
                                      children: [
                                        TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
                                        MarkerLayer(markers: [
                                          Marker(
                                            point: LatLng(ticket.latitude!, ticket.longitude!),
                                            width: 30, height: 30,
                                            child: const Icon(Icons.location_pin, color: Colors.red, size: 30),
                                          ),
                                        ]),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          Text('Status', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8, runSpacing: 8,
                            children: RepairTicket.allStatuses.map((s) {
                              final isSelected = selectedStatus == s;
                              final color = _statusColor(s);
                              return GestureDetector(
                                onTap: () => setSheetState(() => selectedStatus = s),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: isSelected ? color : AppTheme.border),
                                  ),
                                  child: Text(
                                    s == 'in_progress' ? 'In Progress' : (s == 'assigned' ? 'Assigned' : (s == 'resolved' ? 'Resolved' : (s == 'cancelled' ? 'Cancelled' : 'Pending'))),
                                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: isSelected ? color : AppTheme.textMuted),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 20),
                          Text('Priority', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                          const SizedBox(height: 8),
                          Row(
                            children: RepairTicket.allPriorities.map((p) {
                              final isSelected = selectedPriority == p;
                              final color = _priorityColor(p);
                              return Expanded(
                                child: GestureDetector(
                                  onTap: () => setSheetState(() => selectedPriority = p),
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 8),
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: isSelected ? color : AppTheme.border),
                                    ),
                                    child: Center(
                                      child: Text(
                                        p[0].toUpperCase() + p.substring(1),
                                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: isSelected ? color : AppTheme.textMuted),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 20),
                          Text('Notes / Progress', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: notesCtrl,
                            maxLines: 4,
                            style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary),
                            decoration: InputDecoration(
                              hintText: 'Add notes about the repair...',
                              hintStyle: GoogleFonts.inter(color: AppTheme.textMuted),
                              filled: true,
                              fillColor: AppTheme.bgDark,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.border),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.border),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.accentBlue),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: AppTheme.border)),
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          bool changed = false;
                          if (selectedStatus != ticket.status) {
                            final success = await _ticketService.updateStatus(ticket.id, selectedStatus);
                            if (success) {
                              final auth = context.read<AuthService>();
                              final profile = auth.currentProfile;
                              final techName = profile?.fullName ?? 'Technician';
                              await _ticketService.sendAdminNotification(techName, ticket.customerName, selectedStatus);
                              
                              if (mounted) {
                                final isResolved = selectedStatus == 'resolved';
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Ticket marked as ${isResolved ? "Resolved" : "In Progress"} — Admin notified!'),
                                    backgroundColor: isResolved ? AppTheme.accentEmerald : AppTheme.accentBlue,
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                );
                              }
                            }
                            changed = true;
                          }
                          if (selectedPriority != ticket.priority) {
                            await _ticketService.updatePriority(ticket.id, selectedPriority);
                            changed = true;
                          }
                          if (notesCtrl.text != ticket.notes) {
                            await _ticketService.updateNotes(ticket.id, notesCtrl.text);
                            changed = true;
                          }
                          if (changed) {
                            _loadTickets();
                          }
                          if (context.mounted) Navigator.pop(ctx);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accentBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: Text('Save Changes', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _sheetSection(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textMuted, letterSpacing: 0.5)),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary)),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending': return AppTheme.accentAmber;
      case 'assigned': return AppTheme.accentPurple;
      case 'in_progress': return AppTheme.accentBlue;
      case 'resolved': return AppTheme.accentEmerald;
      case 'cancelled': return AppTheme.accentRose;
      default: return AppTheme.textMuted;
    }
  }

  Color _priorityColor(String priority) {
    switch (priority) {
      case 'high': return AppTheme.accentRose;
      case 'medium': return AppTheme.accentAmber;
      case 'low': return AppTheme.accentEmerald;
      default: return AppTheme.textMuted;
    }
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color: AppTheme.textMuted.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.engineering_outlined, size: 28, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 16),
          Text('No tickets found', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          const SizedBox(height: 4),
          Text('Try adjusting your search or filters.', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: 5,
      itemBuilder: (context, index) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        height: 74,
        decoration: AppTheme.glassCard(radius: 14),
      ),
    );
  }
}
