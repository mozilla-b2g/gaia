(function hold(element, direction, duration) {

  if (direction === 'left') {
    from = '99%';
    to = '15%';
  } else {
    to = '99%';
    from = '15%';
  }

  // to correctly target the element we must move the mouse
  // over its actual position.
  var y = element.offsetTop + (element.offsetHeight / 2);

  SyntheticGestures.touchSupported = false;

  dump('out:' + JSON.stringify({
    to: to,
    from: from,
    y: y,
    duration: duration
  }) + '\n');

  SyntheticGestures.swipe(
    element, to, y, from, y, 1200 || duration, function() {

    marionetteScriptFinished(true);
  });

}.apply(this, arguments));
