import 'models.dart';

class AppStrings {
  AppStrings(this.language);

  final AppLanguage language;

  String get appTitle => _text('SwitchBot Controller', 'SwitchBot Controller');
  String get devices => _text('Devices', 'デバイス');
  String get scenes => _text('Scenes', 'シーン');
  String get settings => _text('Settings', '設定');
  String get tokenLabel => _text('Open Token', 'Open Token');
  String get secretLabel => _text('Secret Key', 'Secret Key');
  String get validateSave => _text('Validate and Save', '検証して保存');
  String get clearCredentials => _text('Clear Stored Credentials', '保存済み認証情報を削除');
  String get pollingInterval => _text('Polling Interval (sec)', 'ポーリング間隔（秒）');
  String get theme => _text('Theme', 'テーマ');
  String get language => _text('Language', '言語');
  String get refresh => _text('Refresh', '更新');
  String get filter => _text('Filter', '絞り込み');
  String get status => _text('Status', 'ステータス');
  String get execute => _text('Execute', '実行');
  String get command => _text('Command', 'コマンド');
  String get commandType => _text('Command Type', 'コマンド種別');
  String get parameter => _text('Parameter', 'パラメータ');
  String get sendCommand => _text('Send Command', 'コマンド送信');
  String get updateStatus => _text('Update Status', 'ステータス更新');
  String get noDevices => _text('No devices available.', 'デバイスがありません。');
  String get noScenes => _text('No scenes available.', 'シーンがありません。');
  String get validateSuccess => _text('Validation success.', '検証に成功しました。');
  String get validateFailure => _text('Validation failed.', '検証に失敗しました。');
  String get selectThemeSystem => _text('Follow System', 'システムに追従');
  String get selectThemeLight => _text('Light', 'ライト');
  String get selectThemeDark => _text('Dark', 'ダーク');
  String get selectLanguageJapanese => _text('Japanese', '日本語');
  String get selectLanguageEnglish => _text('English', 'English');
  String get lastUpdated => _text('Last Updated', '最終更新');
  String get apiError => _text('API error', 'API エラー');

  String _text(String en, String ja) {
    return language == AppLanguage.english ? en : ja;
  }
}
