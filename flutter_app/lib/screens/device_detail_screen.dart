import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';

class DeviceDetailScreen extends StatefulWidget {
  const DeviceDetailScreen({
    super.key,
    required this.appState,
    required this.strings,
    required this.device,
  });

  final AppState appState;
  final AppStrings strings;
  final Device device;

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen> {
  DeviceStatus? _status;
  DateTime? _lastUpdated;
  final TextEditingController _commandController = TextEditingController();
  final TextEditingController _commandTypeController =
      TextEditingController(text: 'command');
  final TextEditingController _parameterController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _refreshStatus();
  }

  @override
  void dispose() {
    _commandController.dispose();
    _commandTypeController.dispose();
    _parameterController.dispose();
    super.dispose();
  }

  Future<void> _refreshStatus() async {
    final status = await widget.appState.fetchDeviceStatus(widget.device.deviceId);
    if (!mounted) return;
    setState(() {
      _status = status;
      _lastUpdated = DateTime.now();
    });
  }

  Future<void> _sendCommand() async {
    final command = _commandController.text.trim();
    final commandType = _commandTypeController.text.trim();
    if (command.isEmpty || commandType.isEmpty) {
      return;
    }
    await widget.appState.sendCommand(
      widget.device.deviceId,
      command: command,
      commandType: commandType,
      parameter: _parameterController.text.trim().isEmpty
          ? null
          : _parameterController.text.trim(),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('コマンドを送信しました。')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final statusEntries = _status?.rawData.entries.toList() ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.device.deviceName),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.device.deviceType, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('ID: ${widget.device.deviceId}'),
          if (widget.device.hubDeviceId != null)
            Text('Hub: ${widget.device.hubDeviceId}'),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(widget.strings.status, style: Theme.of(context).textTheme.titleMedium),
              TextButton.icon(
                onPressed: _refreshStatus,
                icon: const Icon(Icons.refresh),
                label: Text(widget.strings.updateStatus),
              ),
            ],
          ),
          if (_lastUpdated != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('${widget.strings.lastUpdated}: ${_lastUpdated!.toLocal()}'),
            ),
          if (widget.appState.errorMessage != null)
            Text(
              widget.appState.errorMessage!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          if (statusEntries.isEmpty)
            const Text('ステータスがありません。')
          else
            ...statusEntries.map(
              (entry) => ListTile(
                title: Text(entry.key),
                subtitle: Text(entry.value.toString()),
              ),
            ),
          const Divider(height: 32),
          Text(widget.strings.sendCommand, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _commandController,
            decoration: InputDecoration(labelText: widget.strings.command),
          ),
          TextField(
            controller: _commandTypeController,
            decoration: InputDecoration(labelText: widget.strings.commandType),
          ),
          TextField(
            controller: _parameterController,
            decoration: InputDecoration(labelText: widget.strings.parameter),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _sendCommand,
            child: Text(widget.strings.sendCommand),
          ),
        ],
      ),
    );
  }
}
