import 'package:flutter/foundation.dart';

void logDebug(String message, [Object? error, StackTrace? stack]) {
  if (kDebugMode) {
    debugPrint('[MusicMarket] $message${error != null ? ' | $error' : ''}');
  }
}
