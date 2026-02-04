import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    super.key,
    required this.appState,
    required this.strings,
  });

  final AppState appState;
  final AppStrings strings;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _tokenController;
  late final TextEditingController _secretController;
  late final TextEditingController _pollingController;

  @override
  void initState() {
    super.initState();
    _tokenController = TextEditingController(text: widget.appState.token);
    _secretController = TextEditingController(text: widget.appState.secret);
    _pollingController =
        TextEditingController(text: widget.appState.pollingIntervalSeconds.toString());
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _secretController.dispose();
    _pollingController.dispose();
    super.dispose();
  }

  Future<void> _validateAndSave() async {
    await widget.appState.saveCredentials(
      _tokenController.text.trim(),
      _secretController.text.trim(),
    );
    final success = await widget.appState.validateCredentials();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? widget.strings.validateSuccess : widget.strings.validateFailure,
        ),
      ),
    );
  }

  Future<void> _applyPollingInterval() async {
    final value = int.tryParse(_pollingController.text.trim()) ?? 0;
    await widget.appState.setPollingIntervalSeconds(value);
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _tokenController,
          decoration: InputDecoration(labelText: widget.strings.tokenLabel),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _secretController,
          decoration: InputDecoration(labelText: widget.strings.secretLabel),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: _validateAndSave,
          child: Text(widget.strings.validateSave),
        ),
        TextButton(
          onPressed: widget.appState.clearCredentials,
          child: Text(widget.strings.clearCredentials),
        ),
        const Divider(height: 32),
        TextField(
          controller: _pollingController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: widget.strings.pollingInterval),
          onSubmitted: (_) => _applyPollingInterval(),
        ),
        const SizedBox(height: 8),
        ElevatedButton(
          onPressed: _applyPollingInterval,
          child: Text(widget.strings.pollingInterval),
        ),
        const Divider(height: 32),
        _ThemeSelector(appState: widget.appState, strings: widget.strings),
        const Divider(height: 32),
        _LanguageSelector(appState: widget.appState, strings: widget.strings),
      ],
    );
  }
}

class _ThemeSelector extends StatelessWidget {
  const _ThemeSelector({required this.appState, required this.strings});

  final AppState appState;
  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(strings.theme, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        DropdownButton<ThemeMode>(
          value: appState.themeMode,
          onChanged: (value) {
            if (value != null) {
              appState.setThemeMode(value);
            }
          },
          items: [
            DropdownMenuItem(
              value: ThemeMode.system,
              child: Text(strings.selectThemeSystem),
            ),
            DropdownMenuItem(
              value: ThemeMode.light,
              child: Text(strings.selectThemeLight),
            ),
            DropdownMenuItem(
              value: ThemeMode.dark,
              child: Text(strings.selectThemeDark),
            ),
          ],
        ),
      ],
    );
  }
}

class _LanguageSelector extends StatelessWidget {
  const _LanguageSelector({required this.appState, required this.strings});

  final AppState appState;
  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(strings.language, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        DropdownButton<AppLanguage>(
          value: appState.language,
          onChanged: (value) {
            if (value != null) {
              appState.setLanguage(value);
            }
          },
          items: [
            DropdownMenuItem(
              value: AppLanguage.japanese,
              child: Text(strings.selectLanguageJapanese),
            ),
            DropdownMenuItem(
              value: AppLanguage.english,
              child: Text(strings.selectLanguageEnglish),
            ),
          ],
        ),
      ],
    );
  }
}
