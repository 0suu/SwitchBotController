import 'package:flutter/material.dart';

import 'app_state.dart';
import 'l10n.dart';
import 'models.dart';
import 'screens/devices_screen.dart';
import 'screens/scenes_screen.dart';
import 'screens/settings_screen.dart';
import 'services/switchbot_api.dart';

void main() {
  runApp(const SwitchBotApp());
}

class SwitchBotApp extends StatefulWidget {
  const SwitchBotApp({super.key});

  @override
  State<SwitchBotApp> createState() => _SwitchBotAppState();
}

class _SwitchBotAppState extends State<SwitchBotApp> {
  late final AppState _appState;

  @override
  void initState() {
    super.initState();
    _appState = AppState(api: SwitchBotApi());
    _appState.load();
  }

  @override
  void dispose() {
    _appState.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _appState,
      builder: (context, _) {
        final strings = AppStrings(_appState.language);
        return MaterialApp(
          title: strings.appTitle,
          themeMode: _appState.themeMode,
          theme: ThemeData.light(useMaterial3: true),
          darkTheme: ThemeData.dark(useMaterial3: true),
          home: HomeScreen(appState: _appState, strings: strings),
        );
      },
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.appState,
    required this.strings,
  });

  final AppState appState;
  final AppStrings strings;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.appState.lastTabIndex;
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
    widget.appState.setLastTabIndex(index);
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      DevicesScreen(appState: widget.appState, strings: widget.strings),
      ScenesScreen(appState: widget.appState, strings: widget.strings),
      SettingsScreen(appState: widget.appState, strings: widget.strings),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.strings.appTitle),
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _onTabSelected,
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.devices),
            label: widget.strings.devices,
          ),
          NavigationDestination(
            icon: const Icon(Icons.movie_filter),
            label: widget.strings.scenes,
          ),
          NavigationDestination(
            icon: const Icon(Icons.settings),
            label: widget.strings.settings,
          ),
        ],
      ),
    );
  }
}
