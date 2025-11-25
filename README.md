# SwitchBot Controller
<p>
  <img src="https://github.com/user-attachments/assets/11873232-5be8-41ab-8665-313066dca139" width="45%">
  <img src="https://github.com/user-attachments/assets/77875e1d-b3d9-42e8-a9dd-1e8936c705c8" width="45%">
</p>

[English README is here](README_en.md)

Electron デスクトップクライアントで SwitchBot Cloud API を操作し、デバイスの状態確認・操作・シーン実行を行うアプリです。React (Vite) + MUI + Redux Toolkit を採用し、英語/日本語 UI に対応しています。

本アプリのコードの約 99% は AI によって自動生成されており、人間による完全な動作確認やコードレビューは行われていません。  
本アプリの利用により、お使いのコンピュータ、SwitchBot デバイス、アカウント、ネットワーク環境などにいかなる不具合・損害が発生した場合でも、作者は一切の責任を負いません。自己責任でご利用ください。

## 主な機能
- デバイス一覧表示と絞り込み、詳細画面でのステータス確認
- デバイスごとの操作パネル（物理デバイスの状態取得、赤外線リモコンのカスタムコマンド実行）
- シーン一覧の取得とワンクリック実行
- API トークン / シークレットの保存・検証、ポーリング間隔やテーマ (light/dark/system)・言語 (en/ja) 設定
- 前回開いていた画面の復元とデバイスステータスの自動ポーリング

## 対応デバイス一覧

公式 SwitchBot API ドキュメント（`SwitchBotApiDocuments.md`）に記載されているデバイスと、本アプリにおける対応状況（`〇` / `△` / `?` / `×`）の一覧は、[Device Support Matrix / 対応デバイス一覧](DEVICE_SUPPORT_MATRIX.md) を参照してください。

## アプリの使い方（エンドユーザー向け）
1. SwitchBot 公式モバイルアプリから Cloud API の **Open Token** と **Secret Key** を取得します。  
   （「クラウドサービス」→ 開発者向けメニュー。詳しくは SwitchBot の公式ドキュメントを参照してください。）
2. アプリを起動します。
   - パッケージ済みバイナリをお持ちの場合：インストーラ等から通常のデスクトップアプリとしてインストール・起動します。
   - ソースコードから起動する場合は、後述の「開発者向けセットアップ」を参照してください。
3. 画面上部のタブから `Settings` を開きます。
4. **Open Token** と **Secret Key** を入力し、`Validate and Save` ボタンを押します。
   - 検証に成功すると、認証情報がローカルに保存され、アプリから SwitchBot Cloud API にアクセスできるようになります。
   - `Clear Stored Credentials` で保存済みの認証情報を削除できます。
5. 必要に応じて以下を設定します。
   - **Polling Interval**：物理デバイスのステータスを定期的に取得する間隔（秒）。`0` にするとポーリングを無効化。
   - **Theme**：`Light` / `Dark` / `Follow System`（OS のテーマに追従）。
   - **Language**：`English` / `Japanese`。
6. `Devices` タブを開きます。
   - デバイス一覧からステータスを確認し、詳細画面を開いてより詳細な情報を確認できます。
   - 対応している物理デバイスでは、ON/OFF や位置・モード変更などの操作が可能です。
   - 赤外線リモコンについては、登録済みのカスタムコマンドを UI から実行できます。
7. `Scenes` タブでは：
   - SwitchBot Cloud 上のシーン一覧を取得し、
   - ワンクリックでシーンを実行できます。

## 開発者向けセットアップガイド

### 1. リポジトリのクローンと依存関係のインストール
```bash
git clone https://github.com/0suu/SwitchBotController.git
cd SwitchBotController
npm install
```

### 2. 開発サーバーの起動（ホットリロード）
```bash
npm run dev
```
Vite (renderer) と Electron (main) が並行起動します。  
起動後、Settings 画面から API Token / Secret を登録・検証してください。

開発モードではなく、ビルド済みアプリとして起動したい場合は、先にビルドを行ってから `npm run start` を実行します。
```bash
npm run build
npm run start
```

### 3. テスト
```bash
npm test            # 単体テスト
npm run test:coverage
```

### 4. ビルド & パッケージング
```bash
npm run build       # renderer と main のビルド
npm run package     # 各プラットフォーム向けインストーラを release/ に出力
```
macOS / Linux 向けビルドでは `assets/icon.icns` と `assets/icon.png` が必要です（存在しない場合は独自のアイコンに差し替えてください）。

Electron Builder の設定 (`package.json` の `build` フィールド) により、アプリ ID や配布ターゲット、アイコンなどが制御されます。

依存ライブラリのライセンス一覧は `npm run build:licenses`（`npm run build` 内で自動実行）で `build/licenses/THIRD_PARTY_LICENSES.txt` に生成され、ルートの `LICENSE` と共にインストーラへ同梱されます。依存パッケージを更新した際はこのスクリプトを再実行してください。

## 必要環境
- Node.js 20 以上推奨（Electron 36 ベース）
- npm
- SwitchBot アカウントの API Token / Secret（アプリ内「Settings」で入力・検証）

## 主要ディレクトリ
- `src/main/` … Electron メインプロセス。SwitchBot API への IPC ハンドラと `electron-store` による設定・認証情報の保存を行います。
- `src/preload/` … コンテキスト分離された bridge (`electronStore` / `switchBotBridge`) を公開します。
- `src/renderer/` … React + Vite フロントエンド。デバイス一覧 / 詳細 / シーン / 設定画面を実装しています。
- `src/api/` … SwitchBot API の型定義とラッパー。

## セキュリティの注意
`electron-store` で API トークンとシークレットを保存しています。  
デフォルトでは暗号化されずローカルユーザーが読み取れるため、配布時は `src/main/main.ts` の `encryptionKey` を設定するか、OS キーチェーンを利用するなど、安全な秘匿方法を検討してください。

## ライセンス
ISC License
