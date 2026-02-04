import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

import '../models.dart';

class SwitchBotApi {
  SwitchBotApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  final Uri _baseUri = Uri.parse('https://api.switch-bot.com/v1.1');

  Map<String, String> _buildHeaders({
    required String token,
    required String secret,
  }) {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    final sign = _generateSign(secret: secret, token: token, timestamp: timestamp);
    return {
      'Authorization': token,
      'sign': sign,
      't': timestamp,
      'Content-Type': 'application/json',
    };
  }

  String _generateSign({
    required String secret,
    required String token,
    required String timestamp,
  }) {
    final key = utf8.encode(secret);
    final data = utf8.encode('$token$timestamp');
    final hmacSha256 = Hmac(sha256, key);
    return base64Encode(hmacSha256.convert(data).bytes);
  }

  Future<List<Device>> fetchDevices({
    required String token,
    required String secret,
  }) async {
    final response = await _client.get(
      _baseUri.replace(path: '/v1.1/devices'),
      headers: _buildHeaders(token: token, secret: secret),
    );
    final payload = _parseResponse(response);
    final deviceList = payload['deviceList'] as List<dynamic>? ?? [];
    return deviceList
        .map((device) => Device.fromJson(device as Map<String, dynamic>))
        .toList();
  }

  Future<DeviceStatus> fetchDeviceStatus({
    required String token,
    required String secret,
    required String deviceId,
  }) async {
    final response = await _client.get(
      _baseUri.replace(path: '/v1.1/devices/$deviceId/status'),
      headers: _buildHeaders(token: token, secret: secret),
    );
    final payload = _parseResponse(response);
    return DeviceStatus.fromJson(payload);
  }

  Future<List<Scene>> fetchScenes({
    required String token,
    required String secret,
  }) async {
    final response = await _client.get(
      _baseUri.replace(path: '/v1.1/scenes'),
      headers: _buildHeaders(token: token, secret: secret),
    );
    final payload = _parseResponse(response);
    final sceneList = payload['sceneList'] as List<dynamic>? ?? [];
    return sceneList
        .map((scene) => Scene.fromJson(scene as Map<String, dynamic>))
        .toList();
  }

  Future<void> executeScene({
    required String token,
    required String secret,
    required String sceneId,
  }) async {
    final response = await _client.post(
      _baseUri.replace(path: '/v1.1/scenes/$sceneId/execute'),
      headers: _buildHeaders(token: token, secret: secret),
    );
    _parseResponse(response);
  }

  Future<void> sendCommand({
    required String token,
    required String secret,
    required String deviceId,
    required String command,
    required String commandType,
    String? parameter,
  }) async {
    final response = await _client.post(
      _baseUri.replace(path: '/v1.1/devices/$deviceId/commands'),
      headers: _buildHeaders(token: token, secret: secret),
      body: jsonEncode({
        'command': command,
        'parameter': parameter ?? 'default',
        'commandType': commandType,
      }),
    );
    _parseResponse(response);
  }

  Map<String, dynamic> _parseResponse(http.Response response) {
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception('HTTP ${response.statusCode}: ${response.body}');
    }
    if (decoded['statusCode'] != 100) {
      throw Exception(decoded['message'] ?? 'API error');
    }
    return decoded['body'] as Map<String, dynamic>? ?? {};
  }
}
