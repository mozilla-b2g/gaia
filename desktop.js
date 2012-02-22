/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function OnLoad() {
  var contentFrame = document.getElementById("contentFrame");
  var contentWindow = contentFrame.contentWindow;
  var buttons = document.querySelectorAll("button");
  for (var n = 0; n < buttons.length; ++n) {
    var button = buttons[n];
    button.ontouchstart = button.onmousedown = function() {
      contentWindow.postMessage("moz-key-down-" + button.id, "*");
    }
    button.ontouchend = button.onmouseup = function() {
      contentWindow.postMessage("moz-key-up-" + button.id, "*");
    }
  }
}
