import packageJson from "../../../package.json";

const APP_VERSION = packageJson?.version || "0.0.0";

export type Language = "en" | "ja";

type Dictionary = Record<string, string>;

const en: Dictionary = {
  // Generic
  "App Title": "SwitchBot Client",
  "Footer Version": `SwitchBot PC Client v${APP_VERSION}`,
  Devices: "Devices",
  Settings: "Settings",
  Theme: "Theme",
  "Light Theme": "Light",
  "Dark Theme": "Dark",
  "Follow System": "Match system",
  "Select how the app theme is applied.": "Choose how the app theme is applied.",
  Language: "Language",
  English: "English",
  Japanese: "日本語",
  Scenes: "Scenes",
  "App Info": "App Info",
  "App Version": "App Version",

  // Device list
  "Device List": "Device List",
  Refresh: "Refresh",
  Reorder: "Reorder",
  Done: "Done",
  "Drag cards by the handle to reorder. Press Done to save.":
    "Drag cards by the handle to reorder. Press Done to save.",
  "Loading devices...": "Loading devices...",
  "API Token not set. Please configure your API credentials in the Settings screen.":
    "API Token not set. Please configure your API credentials in the Settings screen.",
  "API credentials are set but not validated. Please test them in Settings.":
    "API credentials are set but not validated. Please test them in Settings.",
  "API credentials not configured. Please go to Settings.":
    "API credentials not configured. Please go to Settings.",
  "Cannot refresh. API credentials are not valid or not set.":
    "Cannot refresh. API credentials are not valid or not set.",
  "No devices found, or check API permissions.": "No devices found, or check API permissions.",
  "Unnamed Device": "Unnamed Device",
  Unknown: "Unknown",
  Details: "Details",
  "API credentials are not set or not validated. Please check settings.":
    "API credentials are not set or not validated. Please check settings.",
  "API Token and Secret are not set.": "API Token and Secret are not set.",
  "API token or secret is missing.": "API token or secret is missing.",
  "API credentials not set or validated for polling.": "API credentials not set or validated for polling.",
  "No devices to poll.": "No devices to poll.",

  // Device detail
  "No device selected.": "No device selected.",
  "Back to List": "Back to List",
  "Refresh Status": "Refresh Status",
  "API Credentials not validated.": "API Credentials not validated.",
  "Controls Section Title": "Controls",
  Status: "Status",
  "Status API is not available for virtual infrared remotes. Use the controls above to send commands.":
    "Status API is not available for virtual infrared remotes. Use the controls above to send commands.",
  "Loading status...": "Loading status...",
  "Error fetching status:": "Error fetching status:",
  "Confirm on/off/press actions": "Confirm on/off/press actions",
  "Show confirmation dialog before executing on/off/press actions.":
    "Show a confirmation dialog before executing on/off/press actions.",

  // Settings
  "Settings Title": "Settings",
  "SwitchBot Cloud Credentials": "SwitchBot Cloud Credentials",
  "Enter your SwitchBot Open Token and Secret Key so this app can access your devices via the official cloud API.":
    "Enter your SwitchBot Open Token and Secret Key so this app can access your devices via the official cloud API.",
  "On the SwitchBot mobile app instructions":
    "On the SwitchBot mobile app: go to Profile → Preferences → About, tap the app version 10 times to show Developer Options, then tap Get Token to obtain your token and secret.",
  "Credentials storage note":
    "Your credentials are stored locally on this computer using the app's local configuration store and are only used to communicate with SwitchBot cloud APIs.",
  "Open Token": "Open Token",
  "Secret Key": "Secret Key",
  "Copy the Open Token from the SwitchBot mobile app and paste it here.":
    "Copy the Open Token from the SwitchBot mobile app and paste it here.",
  "Copy the Secret Key from the SwitchBot mobile app. Keep this value private.":
    "Copy the Secret Key from the SwitchBot mobile app. Keep this value private.",
  "Validate and Save": "Validate and Save",
  "Clear Stored Credentials": "Clear Stored Credentials",
  "Token and Secret cannot be empty.": "Token and Secret cannot be empty.",
  "Tip: The credentials you enter here will only be saved if validation succeeds.":
    "Tip: The credentials you enter here will only be saved if validation succeeds.",
  "Polling Interval": "Polling Interval",
  "Polling description":
    "Configure how often the app automatically refreshes device status (in seconds). Set to 0 to disable automatic polling. Very short intervals may cause you to hit SwitchBot API rate limits. SwitchBot's API quota is roughly 10,000 calls per day.",
  "Interval (sec)": "Interval (sec)",
  Save: "Save",

  // DeviceControls - common labels
  "Virtual Remote": "Virtual Remote",
  "Infrared device": "Infrared device",
  On: "On",
  Off: "Off",
  Auto: "Auto",
  Mode: "Mode",
  "Fan speed": "Fan speed",
  Power: "Power",
  "Temperature (°C)": "Temperature (°C)",
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Cool: "Cool",
  Dry: "Dry",
  Fan: "Fan",
  Heat: "Heat",
  Apply: "Apply",
  Start: "Start",
  Stop: "Stop",
  Dock: "Dock",
  Lock: "Lock",
  Unlock: "Unlock",
  "Switch Mode": "Switch Mode",
  "Press Mode": "Press Mode",
  "Custom Mode": "Custom Mode",
  "Mode Unknown": "Mode Unknown",
  "Send setAll": "Send",
  "Night Light": "Night Light",
  "Assigned scene": "Assigned scene",
  "Assign a scene to enable the night light button.": "Assign a scene to enable the night light button.",
  "The assigned scene is not available. Refresh scenes or reassign.":
    "The assigned scene is not available. Refresh scenes or reassign.",
  "Night light button settings": "Night light button settings",
  "Confirm turn on": "Are you sure you want to turn on?",
  "Confirm turn off": "Are you sure you want to turn off?",
  "Confirm press": "Are you sure you want to press?",
  "Confirm command": "Are you sure you want to execute this command?",
  "Confirm action": "Confirm action",
  Cancel: "Cancel",
  Confirm: "Confirm",
  "Assign scene": "Assign scene",
  "Select a scene to run when pressing the night light button.":
    "Select a scene to run when pressing the night light button.",
  "No scene assigned": "No scene assigned",
  "Save assignment": "Save assignment",
  "Reload scenes": "Reload scenes",

  // Misc
  "No quick controls available for this device type.":
    "No quick controls available for this device type.",
  "Custom command": "Custom command",
  "Command name": "Command name",
  Parameter: "Parameter",
  "Send custom command": "Send custom command",
  "Sends directly to SwitchBot API. Keep parameters consistent with your device specification.":
    "Sends directly to SwitchBot API. Keep parameters consistent with your device specification.",

  // Scenes
  "Loading scenes...": "Loading scenes...",
  "No scenes found. Create a manual scene in the SwitchBot app.":
    "No scenes found. Create a manual scene in the SwitchBot app.",
  Execute: "Execute",
  "Executing...": "Executing...",
  "Scene executed successfully.": "Scene executed successfully.",
  "Unnamed Scene": "Unnamed Scene",
};

const ja: Dictionary = {
  // Generic
  "App Title": "SwitchBot クライアント",
  "Footer Version": `SwitchBot PC クライアント v${APP_VERSION}`,
  Devices: "デバイス",
  Settings: "設定",
  Theme: "テーマ",
  "Light Theme": "ライト",
  "Dark Theme": "ダーク",
  "Follow System": "OSに合わせる",
  "Select how the app theme is applied.": "アプリのテーマ適用方法を選択してください。",
  Language: "言語",
  English: "英語",
  Japanese: "日本語",
  Scenes: "シーン",
  "App Info": "アプリ情報",
  "App Version": "アプリバージョン",

  // Device list
  "Device List": "デバイス一覧",
  Refresh: "再読み込み",
  Reorder: "並べ替え",
  Done: "完了",
  "Drag cards by the handle to reorder. Press Done to save.":
    "ハンドルをドラッグして順番を入れ替え、完了で保存します。",
  "Loading devices...": "デバイスを読み込み中...",
  "API Token not set. Please configure your API credentials in the Settings screen.":
    "API トークンが設定されていません。「設定」画面で API 認証情報を設定してください。",
  "API credentials are set but not validated. Please test them in Settings.":
    "API 認証情報は設定されていますが、まだ検証されていません。「設定」画面でテストしてください。",
  "API credentials not configured. Please go to Settings.":
    "API 認証情報が設定されていません。「設定」画面で設定してください。",
  "Cannot refresh. API credentials are not valid or not set.":
    "再読み込みできません。API 認証情報が未設定または無効です。",
  "No devices found, or check API permissions.":
    "デバイスが見つかりません。API 権限を確認してください。",
  "Unnamed Device": "名称未設定デバイス",
  Unknown: "不明",
  Details: "詳細",
  "API credentials are not set or not validated. Please check settings.":
    "API 認証情報が未設定、または検証されていません。設定画面を確認してください。",
  "API Token and Secret are not set.": "API トークンとシークレットが設定されていません。",
  "API token or secret is missing.": "API トークンまたはシークレットが不足しています。",
  "API credentials not set or validated for polling.":
    "ポーリングに必要な API 認証情報が未設定、または検証されていません。",
  "No devices to poll.": "ポーリング対象のデバイスがありません。",

  // Device detail
  "No device selected.": "デバイスが選択されていません。",
  "Back to List": "一覧に戻る",
  "Refresh Status": "ステータス更新",
  "API Credentials not validated.": "API 認証情報が検証されていません。",
  "Controls Section Title": "操作",
  Status: "ステータス",
  "Status API is not available for virtual infrared remotes. Use the controls above to send commands.":
    "赤外線リモコン（仮想デバイス）ではステータス API は使用できません。上のボタンからコマンドを送信してください。",
  "Loading status...": "ステータスを取得中...",
  "Error fetching status:": "ステータス取得エラー:",
  "Confirm on/off/press actions": "操作の確認",
  "Show confirmation dialog before executing on/off/press actions.":
    "オン/オフ/プレス操作の前に確認ダイアログを表示します。",

  // Settings
  "Settings Title": "設定",
  "SwitchBot Cloud Credentials": "SwitchBot クラウド認証情報",
  "Enter your SwitchBot Open Token and Secret Key so this app can access your devices via the official cloud API.":
    "SwitchBot 公式クラウド API にアクセスするため、Open Token と Secret Key を入力してください。",
  "On the SwitchBot mobile app instructions":
    "SwitchBot モバイルアプリで「プロフィール → 設定 → 概要」を開き、バージョンを 10 回タップして「開発者向けオプション」を表示し、「トークンを取得」からトークンとシークレットを取得してください。",
  "Credentials storage note":
    "認証情報はこの PC 上のローカルストアに保存され、SwitchBot クラウド API との通信のみに使用されます。",
  "Open Token": "Open トークン",
  "Secret Key": "シークレットキー",
  "Copy the Open Token from the SwitchBot mobile app and paste it here.":
    "SwitchBot モバイルアプリで取得した Open トークンをコピーして貼り付けてください。",
  "Copy the Secret Key from the SwitchBot mobile app. Keep this value private.":
    "SwitchBot モバイルアプリで取得したシークレットキーをコピーして貼り付けてください。第三者には教えないでください。",
  "Validate and Save": "検証して保存",
  "Clear Stored Credentials": "保存済み認証情報を削除",
  "Token and Secret cannot be empty.": "トークンとシークレットは必須です。",
  "Tip: The credentials you enter here will only be saved if validation succeeds.":
    "ここで入力した認証情報は、検証に成功した場合のみ保存されます。",
  "Polling Interval": "ポーリング間隔",
  "Polling description":
    "デバイスステータスを自動更新する間隔（秒）を設定します。0 にすると自動ポーリングを無効にできます。間隔を短くしすぎると SwitchBot API のレート制限に達する可能性があります。SwitchBot の API 呼び出し上限は 1 日あたり約 1 万回です。",
  "Interval (sec)": "間隔（秒）",
  Save: "保存",

  // DeviceControls - common labels
  "Virtual Remote": "仮想リモコン",
  "Infrared device": "赤外線デバイス",
  On: "オン",
  Off: "オフ",
  Auto: "自動",
  Mode: "モード",
  "Fan speed": "風量",
  Power: "電源",
  "Temperature (°C)": "温度 (°C)",
  Low: "弱",
  Medium: "中",
  High: "強",
  Cool: "冷房",
  Dry: "除湿",
  Fan: "送風",
  Heat: "暖房",
  Apply: "適用",
  Start: "開始",
  Stop: "停止",
  Dock: "ドックへ戻る",
  Lock: "施錠",
  Unlock: "解錠",
  "Switch Mode": "スイッチモード",
  "Press Mode": "プレスモード",
  "Custom Mode": "カスタムモード",
  "Mode Unknown": "モード不明",
  "Send setAll": "送信",
  "Night Light": "常夜灯",
  "Assigned scene": "割り当てシーン",
  "Assign a scene to enable the night light button.": "常夜灯ボタンを有効にするにはシーンを割り当ててください。",
  "The assigned scene is not available. Refresh scenes or reassign.":
    "割り当てられたシーンが見つかりません。再読み込みするか再割り当てしてください。",
  "Night light button settings": "常夜灯ボタンの設定",
  "Confirm turn on": "本当にオンにしますか？",
  "Confirm turn off": "本当にオフにしますか？",
  "Confirm press": "本当にプレス操作を実行しますか？",
  "Confirm command": "本当にこの操作を実行しますか？",
  "Confirm action": "操作の確認",
  Cancel: "キャンセル",
  Confirm: "確認",
  "Assign scene": "シーンを割り当て",
  "Select a scene to run when pressing the night light button.": "常夜灯ボタンを押したときに実行するシーンを選択してください。",
  "No scene assigned": "シーンは未割り当てです",
  "Save assignment": "割り当てを保存",
  "Reload scenes": "シーンを再読み込み",

  // Misc
  "No quick controls available for this device type.":
    "このデバイスタイプにはクイック操作が用意されていません。",
  "Custom command": "カスタムコマンド",
  "Command name": "コマンド名",
  Parameter: "パラメータ",
  "Send custom command": "カスタムコマンドを送信",
  "Sends directly to SwitchBot API. Keep parameters consistent with your device specification.":
    "SwitchBot API に直接送信します。デバイス仕様に合わせてパラメータを設定してください。",

  // Scenes
  "Loading scenes...": "シーンを読み込み中...",
  "No scenes found. Create a manual scene in the SwitchBot app.":
    "シーンが見つかりません。SwitchBot アプリで手動シーンを作成してください。",
  Execute: "実行",
  "Executing...": "実行中...",
  "Scene executed successfully.": "シーンを実行しました。",
  "Unnamed Scene": "名称未設定のシーン",
};

const dictionaries: Record<Language, Dictionary> = {
  en,
  ja,
};

export const translate = (language: Language, key: string): string => {
  const dict = dictionaries[language] || dictionaries.en;
  return dict[key] ?? key;
};
