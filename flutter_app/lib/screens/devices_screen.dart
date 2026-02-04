import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import 'device_detail_screen.dart';

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({
    super.key,
    required this.appState,
    required this.strings,
  });

  final AppState appState;
  final AppStrings strings;

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  String _filterText = '';

  @override
  void initState() {
    super.initState();
    widget.appState.refreshDevices();
  }

  @override
  Widget build(BuildContext context) {
    final devices = widget.appState.devices
        .where((device) => device.deviceName.contains(_filterText))
        .toList();

    return RefreshIndicator(
      onRefresh: () => widget.appState.refreshDevices(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            decoration: InputDecoration(
              labelText: widget.strings.filter,
              prefixIcon: const Icon(Icons.search),
            ),
            onChanged: (value) {
              setState(() {
                _filterText = value;
              });
            },
          ),
          const SizedBox(height: 12),
          if (widget.appState.isLoading)
            const LinearProgressIndicator(),
          if (widget.appState.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                widget.appState.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          if (devices.isEmpty && !widget.appState.isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(widget.strings.noDevices),
            )
          else
            ...devices.map(
              (device) => _DeviceTile(
                device: device,
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => DeviceDetailScreen(
                        appState: widget.appState,
                        strings: widget.strings,
                        device: device,
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _DeviceTile extends StatelessWidget {
  const _DeviceTile({required this.device, required this.onTap});

  final Device device;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListTile(
        title: Text(device.deviceName),
        subtitle: Text(device.deviceType),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
