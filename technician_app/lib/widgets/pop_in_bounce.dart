import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

class PopInBounce extends StatefulWidget {
  final Widget child;
  final Duration delay;
  const PopInBounce({super.key, required this.child, this.delay = Duration.zero});

  @override
  State<PopInBounce> createState() => _PopInBounceState();
}

class _PopInBounceState extends State<PopInBounce> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _scale = Tween<double>(begin: 0.85, end: 1.0).animate(CurvedAnimation(parent: _controller, curve: const Cubic(0.34, 1.56, 0.64, 1.0)));
    _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _controller, curve: Curves.easeIn));
    
    // Use addPostFrameCallback to ensure the widget tree is fully built
    // before scheduling the delayed animation start. Future.delayed alone
    // can silently fail on mobile when the widget isn't fully mounted yet.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.delay == Duration.zero) {
        _controller.forward();
      } else {
        Future.delayed(widget.delay, () {
          if (mounted) _controller.forward();
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: ScaleTransition(
        scale: _scale,
        child: widget.child,
      ),
    );
  }
}
