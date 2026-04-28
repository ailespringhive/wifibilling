import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/auth_service.dart';
import '../services/repair_ticket_service.dart';
import '../config/appwrite_config.dart';
import 'package:appwrite/appwrite.dart';

import '../models/repair_ticket.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../widgets/pop_in_bounce.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';

import 'create_ticket_screen.dart';

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

  bool _isExpandedList = false;

  @override
  Widget build(BuildContext context) {
    // Determine items to display
    final int itemsLimit = 5;
    final displayTickets = _filteredTickets.take(_isExpandedList ? _filteredTickets.length : itemsLimit).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        return ScrollConfiguration(
          behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
          child: RefreshIndicator(
            color: AppTheme.accentBlue,
            backgroundColor: Colors.white,
            onRefresh: _loadTickets,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: ClampingScrollPhysics()),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight,
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                  // ── Search & Header Section ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                    child: Row(
                      children: [
                        // Search Bar
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.grey.shade300),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: TextField(
                              controller: _searchController,
                              onChanged: (v) => setState(() => _searchQuery = v),
                              style: GoogleFonts.inter(
                                color: AppTheme.textPrimary,
                                fontSize: 13,
                              ),
                              decoration: InputDecoration(
                                isDense: true,
                                prefixIconConstraints: const BoxConstraints(minWidth: 36),
                                suffixIconConstraints: const BoxConstraints(minWidth: 36),
                                prefixIcon: Padding(
                                  padding: const EdgeInsets.all(10.0),
                                  child: HugeIcon(icon: HugeIcons.strokeRoundedSearch01, color: AppTheme.textMuted, size: 16.0),
                                ),
                                hintText: 'Search tickets...',
                                hintStyle: GoogleFonts.inter(color: AppTheme.textMuted),
                                filled: false,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                suffixIcon: _searchQuery.isNotEmpty
                                    ? GestureDetector(
                                        onTap: () {
                                          _searchController.clear();
                                          setState(() => _searchQuery = '');
                                        },
                                        child: HugeIcon(icon: HugeIcons.strokeRoundedCancel01, color: AppTheme.textMuted, size: 16.0),
                                      )
                                    : null,
                              ),
                            ),
                          ),
                        ),
                        
                        const SizedBox(width: 12),
                        
                        // Ticket Count Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9), // Slate 100
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: Colors.transparent),
                          ),
                          alignment: Alignment.center,
                          child: RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: '${_filteredTickets.length} ',
                                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                ),
                                TextSpan(
                                  text: _filteredTickets.length == 1 ? 'Ticket' : 'Tickets',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(width: 8),

                        // Create Ticket Button
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const CreateTicketScreen()),
                            ).then((_) {
                              if (mounted) _loadTickets();
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(11),
                            decoration: BoxDecoration(
                              color: AppTheme.accentBlue,
                              borderRadius: BorderRadius.circular(999),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.accentBlue.withValues(alpha: 0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                )
                              ],
                            ),
                            child: AppIcons.icon(AppIcons.addCustomerSvg, color: Colors.white, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Filter chips
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      physics: const NeverScrollableScrollPhysics(), // Prevent scrolling entirely
                      child: Row(
                        children: [
                          _buildChip('all', 'All', null),
                          const SizedBox(width: 6),
                          _buildChip('pending', 'Pending', AppTheme.accentAmber),
                          const SizedBox(width: 6),
                          _buildChip('in_progress', 'InProgress', AppTheme.accentBlue),
                          const SizedBox(width: 6),
                          _buildChip('resolved', 'Resolved', AppTheme.accentEmerald),
                          const SizedBox(width: 6),
                          _buildChip('cancelled', 'Cancelled', AppTheme.accentRose),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),



                  // ── Dynamic List Layout ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _isLoading
                        ? _buildShimmer()
                        : displayTickets.isEmpty
                            ? _buildEmpty()
                            : Column(
                                children: [
                                  for (int i = 0; i < displayTickets.length; i++)
                                    PopInBounce(
                                      delay: Duration(milliseconds: i * 80 + 100),
                                      child: _buildTicketItem(displayTickets[i]),
                                    ),
                                ],
                              ),
                  ),
                  
                  // View More / Less Button pinned to bottom when empty gap is eaten
                  if (!_isLoading && _filteredTickets.length > itemsLimit)
                    Padding(
                      padding: const EdgeInsets.only(top: 8, bottom: 12),
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _isExpandedList = !_isExpandedList);
                        },
                        behavior: HitTestBehavior.opaque,
                        child: Text(
                          _isExpandedList ? 'View Less' : 'View More',
                          style: GoogleFonts.inter(fontSize: 13, color: AppTheme.accentBlue, fontWeight: FontWeight.w600),
                        ),
                      ),
                    )
                  else
                    const SizedBox(height: 12),
                ],
              ),
            ),
          ),
          ),
        );
      },
    );
  }

  Widget _buildChip(String key, String label, Color? color) {
    final isSelected = _filterStatus == key;

    return GestureDetector(
      onTap: () => setState(() => _filterStatus = key),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.grey.shade700 : Colors.white,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: isSelected ? Colors.grey.shade700 : Colors.grey.shade200,
            width: 1,
          ),
          boxShadow: isSelected
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.grey.shade700,
          ),
        ),
      ),
    );
  }

  Widget _buildTicketItem(RepairTicket ticket) {
    final statusColor = _statusColor(ticket.status);
    final priorityColor = _priorityColor(ticket.priority);

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      decoration: AppTheme.glassCard(radius: 14),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _showTicketDetail(ticket),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
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
                      child: Center(
                        child: HugeIcon(icon: HugeIcons.strokeRoundedWrench01, color: statusColor, size: 18.0),
                      ),
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
                          // Show assigned technician name if set
                          if (ticket.technicianName.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                HugeIcon(icon: HugeIcons.strokeRoundedUser, color: AppTheme.accentBlue, size: 12.0),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    ticket.technicianName,
                                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: AppTheme.accentBlue),
                                    maxLines: 1, overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (ticket.status != 'resolved')
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
    
    List<XFile> proofImageFiles = [];
    bool isUploadingProof = false;
    
    // Personnel assignment state
    String? selectedTechId = ticket.technicianId.isNotEmpty ? ticket.technicianId : null;
    String? selectedTechName = ticket.technicianName.isNotEmpty ? ticket.technicianName : null;
    List<Map<String, String>> personnelList = [];
    bool personnelLoaded = false;
    
    String? validationError;

    // Pre-fetch personnel
    _fetchPersonnel().then((list) {
      personnelList = list;
      personnelLoaded = true;
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            bool hasValidTech = selectedTechId != null && 
                                selectedTechId!.isNotEmpty && 
                                personnelLoaded && 
                                personnelList.any((p) => p['role'] == 'technician' && p['id'] == selectedTechId);

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
                          child: Center(
                            child: HugeIcon(icon: HugeIcons.strokeRoundedWrench01, color: _statusColor(ticket.status), size: 18.0),
                          ),
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
                          icon: HugeIcon(icon: HugeIcons.strokeRoundedDelete02, color: AppTheme.accentRose, size: 22.0),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: HugeIcon(icon: HugeIcons.strokeRoundedCancel01, color: AppTheme.textMuted, size: 22.0),
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
                          if (ticket.imageUrls.isNotEmpty) ...[
                            Text('Initial Issue Photos', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                            const SizedBox(height: 8),
                            SizedBox(
                              height: 150,
                              child: _ImageCarousel(imageUrls: ticket.imageUrls),
                            ),
                            const SizedBox(height: 16),
                          ],
                          if (ticket.proofUrls.isNotEmpty) ...[
                            Text('Proof Repaired', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                            const SizedBox(height: 8),
                            SizedBox(
                              height: 150,
                              child: _ImageCarousel(imageUrls: ticket.proofUrls),
                            ),
                            const SizedBox(height: 16),
                          ],
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
                                        TileLayer(
                                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                          userAgentPackageName: 'com.wifibilling.technician_app',
                                          tileProvider: NetworkTileProvider(headers: const {'User-Agent': 'WiFiBillingApp/1.0.0 (admin@springhive.com)'}),
                                        ),
                                        MarkerLayer(markers: [
                                          Marker(
                                            point: LatLng(ticket.latitude!, ticket.longitude!),
                                            width: 30, height: 30,
                                            child: HugeIcon(icon: HugeIcons.strokeRoundedLocation01, color: Colors.red, size: 30.0),
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
                                onTap: () => setSheetState(() {
                                  selectedStatus = s;
                                  validationError = null;
                                }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: isSelected ? color : AppTheme.border),
                                  ),
                                  child: Text(
                                    s == 'in_progress' ? 'In Progress' : (s == 'resolved' ? 'Resolved' : (s == 'cancelled' ? 'Cancelled' : 'Pending')),
                                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: isSelected ? color : AppTheme.textMuted),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          if (selectedStatus == 'resolved' && ticket.status != 'resolved') ...[
                            const SizedBox(height: 20),
                            Text('Proof Repaired', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                            const SizedBox(height: 8),
                            if (proofImageFiles.isNotEmpty)
                              Wrap(
                                spacing: 12, runSpacing: 12,
                                children: [
                                  ...proofImageFiles.map((file) {
                                    return Stack(
                                      children: [
                                        Container(
                                          height: 100, width: 100,
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(color: AppTheme.border),
                                            image: DecorationImage(image: kIsWeb ? NetworkImage(file.path) : FileImage(File(file.path)) as ImageProvider, fit: BoxFit.cover),
                                          ),
                                        ),
                                        Positioned(
                                          right: -4, top: -4,
                                          child: IconButton(
                                            icon: const CircleAvatar(radius: 12, backgroundColor: Colors.black54, child: Icon(Icons.close, size: 14, color: Colors.white)),
                                            onPressed: () => setSheetState(() => proofImageFiles.remove(file)),
                                          ),
                                        ),
                                      ],
                                    );
                                  }),
                                  GestureDetector(
                                    onTap: () async {
                                      final picker = ImagePicker();
                                      final files = await picker.pickMultiImage(imageQuality: 70);
                                      if (files.isNotEmpty) setSheetState(() => proofImageFiles.addAll(files));
                                    },
                                    child: Container(
                                      height: 100, width: 100,
                                      decoration: BoxDecoration(color: AppTheme.bgDark, border: Border.all(color: AppTheme.border), borderRadius: BorderRadius.circular(12)),
                                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                        const Icon(Icons.add_a_photo, color: AppTheme.textMuted, size: 28),
                                        const SizedBox(height: 8),
                                        Text('Add more', style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted))
                                      ]),
                                    ),
                                  ),
                                ]
                              )
                            else
                              GestureDetector(
                                onTap: () async {
                                  final picker = ImagePicker();
                                  final files = await picker.pickMultiImage(imageQuality: 70);
                                  if (files.isNotEmpty) setSheetState(() => proofImageFiles.addAll(files));
                                },
                                child: Container(
                                  height: 120,
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    color: AppTheme.bgDark,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppTheme.border),
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      HugeIcon(icon: HugeIcons.strokeRoundedCamera01, color: AppTheme.textMuted, size: 28.0),
                                      const SizedBox(height: 8),
                                      Text('Tap to select photos', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                          const SizedBox(height: 20),
                          // ── Assigned Personnel Section ──
                          // Only show dropdowns when "In Progress". Read-only when "Resolved".
                          if (selectedStatus == 'in_progress')
                            _buildPersonnelDropdowns(
                              personnelList: personnelList,
                              personnelLoaded: personnelLoaded,
                              selectedTechId: selectedTechId,
                              selectedTechName: selectedTechName,
                              onTechChanged: (id, name) {
                                setSheetState(() {
                                  selectedTechId = id;
                                  selectedTechName = name;
                                  validationError = null;
                                });
                              },
                            )
                          else if (selectedStatus == 'resolved' && (selectedTechName != null && selectedTechName!.isNotEmpty))
                            _buildResolvedPersonnelInfo(
                              technicianName: selectedTechName,
                            ),
                          if (ticket.status != 'resolved') ...[
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
                          ], // end if ticket.status != 'resolved'
                          if (ticket.status != 'resolved') ...[
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
                          ] else if (ticket.notes.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            Text('Notes / Progress', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.bgDark,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: Text(ticket.notes, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary)),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  if (ticket.status != 'resolved')
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                      decoration: const BoxDecoration(
                        border: Border(top: BorderSide(color: AppTheme.border)),
                      ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (validationError != null)
                              Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppTheme.accentRose.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppTheme.accentRose),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline, color: AppTheme.accentRose, size: 20),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        validationError!,
                                        style: GoogleFonts.inter(color: AppTheme.accentRose, fontSize: 13, fontWeight: FontWeight.w500),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: isUploadingProof ? null : () async {
                                  if ((selectedStatus == 'in_progress' || selectedStatus == 'resolved') && !hasValidTech) {
                                    setSheetState(() {
                                      validationError = 'Please assign a technician before setting status to ${selectedStatus == 'in_progress' ? 'In Progress' : 'Resolved'}.';
                                    });
                                    return;
                                  }
                                  if (selectedStatus == 'resolved' && ticket.status != 'resolved' && proofImageFiles.isEmpty) {
                                    setSheetState(() {
                                      validationError = 'Proof Repaired photos are required to resolve a ticket.';
                                    });
                                    return;
                                  }

                            setSheetState(() => isUploadingProof = true);
                            bool changed = false;
                            
                            if (selectedStatus != ticket.status) {
                              bool success = false;
                              final auth = context.read<AuthService>();
                              final profile = auth.currentProfile;
                              final techName = profile?.fullName ?? 'Technician';
                              final techId = profile?.userId ?? '';
                              
                              List<String> uploadedUrls = [];
                              bool allUploadsSuccess = true;
                              if (selectedStatus == 'resolved' && proofImageFiles.isNotEmpty) {
                                 for (int i = 0; i < proofImageFiles.length; i++) {
                                    var file = proofImageFiles[i];
                                    final bytes = await file.readAsBytes();
                                    final uploadedUrl = await _ticketService.uploadTicketImageBytes(bytes, 'proof_${ticket.id}_${DateTime.now().millisecondsSinceEpoch}_$i.jpg');
                                    if (uploadedUrl != null) {
                                      uploadedUrls.add(uploadedUrl);
                                    } else {
                                      allUploadsSuccess = false;
                                    }
                                 }
                                 if (uploadedUrls.isNotEmpty) {
                                   success = await _ticketService.resolveTicketWithProof(ticket.id, ticket.imageUrls, uploadedUrls, technicianId: techId);
                                 }
                              } else {
                                 success = await _ticketService.updateStatus(ticket.id, selectedStatus);
                              }
                              
                              if (success) {
                                 final messenger = ScaffoldMessenger.of(context);
                                 await _ticketService.sendAdminNotification(techName, ticket.customerName, selectedStatus);
                                 
                                 if (mounted) {
                                   final isResolved = selectedStatus == 'resolved';
                                   messenger.showSnackBar(
                                     SnackBar(
                                       content: Text('Ticket marked as ${isResolved ? "Resolved" : "In Progress"} — Admin notified!'),
                                       backgroundColor: isResolved ? AppTheme.accentEmerald : AppTheme.accentBlue,
                                       behavior: SnackBarBehavior.floating,
                                       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                     ),
                                   );
                                 }
                              } else {
                                 if (selectedStatus == 'resolved' && proofImageFiles.isNotEmpty) {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                        content: Text(!allUploadsSuccess ? 'Failed to upload some proof images on the server. Try again.' : 'Failed to update ticket status.'),
                                        backgroundColor: AppTheme.accentRose,
                                        duration: const Duration(seconds: 5),
                                      ));
                                    }
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
                            // Save assigned personnel
                            final techChanged = (selectedTechId ?? '') != ticket.technicianId || (selectedTechName ?? '') != ticket.technicianName;
                            if (techChanged) {
                              await _ticketService.updateAssignedPersonnel(
                                ticket.id,
                                technicianId: selectedTechId ?? '',
                                technicianName: selectedTechName ?? '',
                              );
                              changed = true;
                            }
                            if (changed) {
                              _loadTickets();
                            }
                            if (context.mounted) {
                               setSheetState(() => isUploadingProof = false);
                               Navigator.pop(ctx);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.accentBlue,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          child: Text(isUploadingProof ? 'Uploading Proof...' : 'Save Changes', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
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

  /// Interactive personnel dropdown selectors for assigning technician
  Widget _buildPersonnelDropdowns({
    required List<Map<String, String>> personnelList,
    required bool personnelLoaded,
    required String? selectedTechId,
    required String? selectedTechName,
    required void Function(String? id, String? name) onTechChanged,
  }) {
    final technicians = personnelList.where((p) => p['role'] == 'technician').toList();

    if (!personnelLoaded) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Assigned Personnel', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.bgDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.textMuted)),
                const SizedBox(width: 10),
                Text('Loading personnel...', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Assign Personnel', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.bgDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Technician Dropdown
              Row(
                children: [
                  HugeIcon(icon: HugeIcons.strokeRoundedWrench01, color: AppTheme.accentBlue, size: 16.0),
                  const SizedBox(width: 8),
                  Text('Technician', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accentBlue)),
                ],
              ),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: AppTheme.bgCard,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: (selectedTechId != null && selectedTechId.isNotEmpty && technicians.any((t) => t['id'] == selectedTechId)) ? selectedTechId : '',
                    isExpanded: true,
                    hint: Text('Select technician...', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted)),
                    icon: HugeIcon(icon: HugeIcons.strokeRoundedArrowDown01, color: AppTheme.textMuted, size: 18.0),
                    dropdownColor: AppTheme.bgCard,
                    style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary),
                    items: [
                      DropdownMenuItem<String>(
                        value: '',
                        child: Text('— None —', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted, fontStyle: FontStyle.italic)),
                      ),
                      ...technicians.map((t) => DropdownMenuItem<String>(
                        value: t['id'],
                        child: Text(t['name'] ?? 'Unknown', style: GoogleFonts.inter(fontSize: 13)),
                      )),
                    ],
                    onChanged: (val) {
                      if (val == '') {
                        onTechChanged(null, null);
                      } else {
                        final tech = technicians.firstWhere((t) => t['id'] == val, orElse: () => {});
                        onTechChanged(val, tech['name']);
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Read-only display of personnel who resolved the ticket
  Widget _buildResolvedPersonnelInfo({
    required String? technicianName,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Repaired By', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.bgDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (technicianName != null && technicianName.isNotEmpty) ...[
                Row(
                  children: [
                    HugeIcon(icon: HugeIcons.strokeRoundedWrench01, color: AppTheme.accentBlue, size: 16.0),
                    const SizedBox(width: 8),
                    Text('Technician', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.accentBlue)),
                  ],
                ),
                const SizedBox(height: 4),
                Padding(
                  padding: const EdgeInsets.only(left: 24),
                  child: Text(technicianName, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// Fetches technicians and collectors from admin's users_profile collection
  Future<List<Map<String, String>>> _fetchPersonnel() async {
    try {
      final db = AppwriteService().tablesDB;
      final response = await db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: 'users_profile',
        queries: [
          Query.limit(100),
        ],
      );

      final List<Map<String, String>> result = [];
      for (final doc in response.rows) {
        final data = doc.data;
        final role = (data['role'] ?? '').toString().toLowerCase();
        if (role == 'technician' || role == 'collector') {
          final firstName = data['firstName'] ?? '';
          final lastName = data['lastName'] ?? '';
          result.add({
            'name': '$firstName $lastName'.trim(),
            'role': role,
            'id': data[r'$id'] ?? '',
          });
        }
      }
      return result;
    } catch (e) {
      debugPrint('Error fetching personnel: $e');
      return [];
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending': return AppTheme.accentAmber;
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
            child: HugeIcon(icon: HugeIcons.strokeRoundedRepair, color: AppTheme.textMuted, size: 28.0),
          ),
          const SizedBox(height: 16),
          Text('No tickets found', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          const SizedBox(height: 4),
          Text('Try adjusting your search or filters.', style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _buildShimmer({bool isExpanded = true}) {
    return Column(
      children: List.generate(
        5,
        (i) {
          final child = Container(
            height: 72,
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 6),
            decoration: AppTheme.glassCard(radius: 14),
          );
          return isExpanded ? child : Expanded(child: child);
        },
      ),
    );
  }
}

class _ImageCarousel extends StatefulWidget {
  final List<String> imageUrls;
  const _ImageCarousel({required this.imageUrls});

  @override
  State<_ImageCarousel> createState() => _ImageCarouselState();
}

class _ImageCarouselState extends State<_ImageCarousel> {
  final PageController _controller = PageController();
  int _currentIndex = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_currentIndex < widget.imageUrls.length - 1) {
      _controller.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    } else {
      _controller.animateToPage(0, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  void _prev() {
    if (_currentIndex > 0) {
      _controller.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    } else {
      _controller.animateToPage(widget.imageUrls.length - 1, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.imageUrls.isEmpty) return const SizedBox.shrink();
    
    return Stack(
      children: [
        PageView.builder(
          controller: _controller,
          onPageChanged: (idx) => setState(() => _currentIndex = idx),
          itemCount: widget.imageUrls.length,
          itemBuilder: (ctx, i) {
            return Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
                image: DecorationImage(
                  image: NetworkImage(widget.imageUrls[i]),
                  fit: BoxFit.cover,
                ),
              ),
            );
          },
        ),
        if (widget.imageUrls.length > 1) ...[
          Positioned(
            left: 8, top: 0, bottom: 0,
            child: Center(
              child: GestureDetector(
                onTap: _prev,
                child: const CircleAvatar(
                  backgroundColor: Colors.black54,
                  radius: 16,
                  child: Icon(Icons.chevron_left, color: Colors.white, size: 20),
                ),
              ),
            ),
          ),
          Positioned(
            right: 8, top: 0, bottom: 0,
            child: Center(
              child: GestureDetector(
                onTap: _next,
                child: const CircleAvatar(
                  backgroundColor: Colors.black54,
                  radius: 16,
                  child: Icon(Icons.chevron_right, color: Colors.white, size: 20),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 8, left: 0, right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                widget.imageUrls.length,
                (index) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 6, height: 6,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _currentIndex == index ? Colors.white : Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

