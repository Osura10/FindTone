import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:cached_network_image/cached_network_image.dart';

class AppNetworkImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final bool isThumbnail;

  const AppNetworkImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.isThumbnail = false,
  });

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.isEmpty) {
      return _buildPlaceholder();
    }

    String finalUrl = imageUrl!;
    // Force https
    if (finalUrl.startsWith('http://')) {
      finalUrl = finalUrl.replaceFirst('http://', 'https://');
    }

    // Optional Cloudinary thumbnail
    if (isThumbnail && finalUrl.contains('/upload/')) {
      finalUrl = finalUrl.replaceFirst('/upload/', '/upload/w_600,q_auto,f_auto/');
    }

    if (kIsWeb) {
      return Image.network(
        finalUrl,
        width: width,
        height: height,
        fit: fit,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return _buildShimmer();
        },
        errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
      );
    } else {
      return CachedNetworkImage(
        imageUrl: finalUrl,
        width: width,
        height: height,
        fit: fit,
        placeholder: (context, url) => _buildShimmer(),
        errorWidget: (context, url, error) => _buildPlaceholder(),
      );
    }
  }

  Widget _buildShimmer() {
    return Container(
      width: width ?? double.infinity,
      height: height ?? double.infinity,
      color: Colors.grey[300],
      child: const Center(child: CircularProgressIndicator()),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: width ?? double.infinity,
      height: height ?? double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.grey, Colors.blueGrey],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(Icons.music_note, color: Colors.white54, size: 40),
      ),
    );
  }
}
