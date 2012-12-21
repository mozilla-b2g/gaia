(function hold(element, length) {
  SyntheticGestures.touchSupported = false;
  SyntheticGestures.hold(element, length, 0, 0, 0, 0, 0, function() {
    marionetteScriptFinished(true);
  });
}.apply(this, arguments));
