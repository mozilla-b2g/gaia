(function () {
  // Like setTimeout, but only takes a function argument.  There's
  // no time argument (always zero) and no arguments (you have to
  // use a closure).
  function setZeroTimeout(fn) {
    setTimeout(fn);
  }

  // Add the one thing we want added to the window object.
  window.setZeroTimeout = setZeroTimeout;
}());
