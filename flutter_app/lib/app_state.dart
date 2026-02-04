import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';
import 'services/switchbot_api.dart';

class AppState extends ChangeNotifier {
  AppState({required this.api});

  final SwitchBotApi api;

  String _token = '';
  String _secret = '';
  int _pollingIntervalSeconds = 10;
  ThemeMode _themeMode = ThemeMode.system;
  AppLanguage _language = AppLanguage.japanese;
  int _lastTabIndex = 0;

  Timer? _pollingTimer;

  List<Device> _devices = [];
  List<Scene> _scenes = [];
  bool _isLoading = false;
  String? _errorMessage;

  String get token => _token;
  String get secret => _secret;
  int get pollingIntervalSeconds => _pollingIntervalSeconds;
  ThemeMode get themeMode => _themeMode;
  AppLanguage get language => _language;
  int get lastTabIndex => _lastTabIndex;

  List<Device> get devices => _devices;
  List<Scene> get scenes => _scenes;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token') ?? '';
    _secret = prefs.getString('secret') ?? '';
    _pollingIntervalSeconds = prefs.getInt('pollingIntervalSeconds') ?? 10;
    _themeMode = ThemeMode.values[prefs.getInt('themeMode') ?? ThemeMode.system.index];
    _language = AppLanguage.values[prefs.getInt('language') ?? AppLanguage.japanese.index];
    _lastTabIndex = prefs.getInt('lastTabIndex') ?? 0;
    notifyListeners();

    _restartPolling();
  }

  Future<void> saveCredentials(String token, String secret) async {
    _token = token;
    _secret = secret;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('secret', secret);
    notifyListeners();
  }

  Future<void> clearCredentials() async {
    _token = '';
    _secret = '';
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('secret');
    notifyListeners();
  }

  Future<void> setPollingIntervalSeconds(int value) async {
    _pollingIntervalSeconds = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('pollingIntervalSeconds', value);
    notifyListeners();
    _restartPolling();
  }

  Future<void> setThemeMode(ThemeMode value) async {
    _themeMode = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('themeMode', value.index);
    notifyListeners();
  }

  Future<void> setLanguage(AppLanguage value) async {
    _language = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('language', value.index);
    notifyListeners();
  }

  Future<void> setLastTabIndex(int index) async {
    _lastTabIndex = index;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('lastTabIndex', index);
    notifyListeners();
  }

  Future<bool> validateCredentials() async {
    if (_token.isEmpty || _secret.isEmpty) {
      _errorMessage = '認証情報が未入力です。';
      notifyListeners();
      return false;
    }
    try {
      await api.fetchDevices(token: _token, secret: _secret);
      _errorMessage = null;
      notifyListeners();
      return true;
    } catch (error) {
      _errorMessage = error.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> refreshDevices({bool showLoading = true}) async {
    if (_token.isEmpty || _secret.isEmpty) {
      _errorMessage = '認証情報が未入力です。';
      notifyListeners();
      return;
    }
    if (showLoading) {
      _isLoading = true;
      notifyListeners();
    }
    try {
      _devices = await api.fetchDevices(token: _token, secret: _secret);
      _errorMessage = null;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshScenes({bool showLoading = true}) async {
    if (_token.isEmpty || _secret.isEmpty) {
      _errorMessage = '認証情報が未入力です。';
      notifyListeners();
      return;
    }
    if (showLoading) {
      _isLoading = true;
      notifyListeners();
    }
    try {
      _scenes = await api.fetchScenes(token: _token, secret: _secret);
      _errorMessage = null;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<DeviceStatus?> fetchDeviceStatus(String deviceId) async {
    if (_token.isEmpty || _secret.isEmpty) {
      _errorMessage = '認証情報が未入力です。';
      notifyListeners();
      return null;
    }
    try {
      final status = await api.fetchDeviceStatus(
        token: _token,
        secret: _secret,
        deviceId: deviceId,
      );
      _errorMessage = null;
      notifyListeners();
      return status;
    } catch (error) {
      _errorMessage = error.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> executeScene(String sceneId) async {
    if (_token.isEmpty || _secret.isEmpty) {
      _errorMessage = '認証情報が未入力です。';
      notifyListeners();
      return false;
    }
    try {
      await api.executeScene(token: _token, secret: _secret, sceneId: sceneId);
      _errorMessage = null;
      notifyListeners();
      return true;
    } catch (error) {
      _errorMessage = error.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> sendCommand(
    String deviceId, {
    required String command,
    required String commandType,
    String? parameter,
  }) async {
    if (_token.isEmpty || _secret.isEmpty) {
      _errorMessage = '認証情報が未入力です。';
      notifyListeners();
      return false;
    }
    try {
      await api.sendCommand(
        token: _token,
        secret: _secret,
        deviceId: deviceId,
        command: command,
        commandType: commandType,
        parameter: parameter,
      );
      _errorMessage = null;
      notifyListeners();
      return true;
    } catch (error) {
      _errorMessage = error.toString();
      notifyListeners();
      return false;
    }
  }

  void _restartPolling() {
    _pollingTimer?.cancel();
    if (_pollingIntervalSeconds <= 0) {
      return;
    }
    _pollingTimer = Timer.periodic(
      Duration(seconds: _pollingIntervalSeconds),
      (_) {
        refreshDevices(showLoading: false);
      },
    );
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }
}
