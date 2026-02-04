class Device {
  Device({
    required this.deviceId,
    required this.deviceName,
    required this.deviceType,
    required this.enableCloudService,
    required this.hubDeviceId,
  });

  final String deviceId;
  final String deviceName;
  final String deviceType;
  final bool enableCloudService;
  final String? hubDeviceId;

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      deviceId: json['deviceId'] as String? ?? '',
      deviceName: json['deviceName'] as String? ?? '',
      deviceType: json['deviceType'] as String? ?? '',
      enableCloudService: json['enableCloudService'] as bool? ?? false,
      hubDeviceId: json['hubDeviceId'] as String?,
    );
  }
}

class DeviceStatus {
  DeviceStatus({required this.rawData});

  final Map<String, dynamic> rawData;

  factory DeviceStatus.fromJson(Map<String, dynamic> json) {
    return DeviceStatus(rawData: json);
  }
}

class Scene {
  Scene({required this.sceneId, required this.sceneName});

  final String sceneId;
  final String sceneName;

  factory Scene.fromJson(Map<String, dynamic> json) {
    return Scene(
      sceneId: json['sceneId'] as String? ?? '',
      sceneName: json['sceneName'] as String? ?? '',
    );
  }
}

enum AppLanguage {
  japanese,
  english,
}
