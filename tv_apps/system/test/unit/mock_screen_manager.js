/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*exported MockScreenManager*/

'use strict';

var MockScreenManager = (function() {
  var screenEnabled = true;

  function turnScreenOn() {
    screenEnabled = true;
  }

  function turnScreenOff() {
    screenEnabled = false;
  }

  return {
    turnScreenOn: turnScreenOn,
    turnScreenOff: turnScreenOff,
    get screenEnabled() {
      return screenEnabled;
    },
    set screenEnabled(value) {
      screenEnabled = value;
    }
  };
})();
