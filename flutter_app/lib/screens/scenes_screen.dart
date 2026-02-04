import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';

class ScenesScreen extends StatefulWidget {
  const ScenesScreen({
    super.key,
    required this.appState,
    required this.strings,
  });

  final AppState appState;
  final AppStrings strings;

  @override
  State<ScenesScreen> createState() => _ScenesScreenState();
}

class _ScenesScreenState extends State<ScenesScreen> {
  @override
  void initState() {
    super.initState();
    widget.appState.refreshScenes();
  }

  @override
  Widget build(BuildContext context) {
    final scenes = widget.appState.scenes;

    return RefreshIndicator(
      onRefresh: () => widget.appState.refreshScenes(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
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
          if (scenes.isEmpty && !widget.appState.isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(widget.strings.noScenes),
            )
          else
            ...scenes.map(
              (scene) => _SceneTile(
                scene: scene,
                onExecute: () async {
                  final success = await widget.appState.executeScene(scene.sceneId);
                  if (!mounted) return;
                  final message = success
                      ? '${scene.sceneName} を実行しました。'
                      : widget.strings.apiError;
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text(message)));
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _SceneTile extends StatelessWidget {
  const _SceneTile({required this.scene, required this.onExecute});

  final Scene scene;
  final VoidCallback onExecute;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListTile(
        title: Text(scene.sceneName),
        trailing: TextButton(
          onPressed: onExecute,
          child: const Text('実行'),
        ),
      ),
    );
  }
}
