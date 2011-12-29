/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

Gaia.AnimationLoop = function(renderCallback) {
  var isRunning = true;
  var lastFrame = Date.now();
  var requestAnimationFrame = function(animFrameCallback) {
    if (window.mozRequestAnimationFrame)
      window.mozRequestAnimationFrame(animFrameCallback);
    else if (window.webkitRequestAnimationFrame)
      window.webkitRequestAnimationFrame(animFrameCallback);
    else if (window.requestAnimationFrame)
      window.requestAnimationFrame(animFrameCallback);
  };

  (function loop(currentFrame) {
    if (isRunning !== false) {
      requestAnimationFrame(loop);
      isRunning = renderCallback(currentFrame - lastFrame);
      lastFrame = currentFrame;
    }
  })(lastFrame);
};
