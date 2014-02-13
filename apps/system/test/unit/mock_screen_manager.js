/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*exported MockScreenManager*/

'use strict';

var MockScreenManager = (function() {
  var screenEnabled = true;

  function turnScreenOn() {
  }

  return {
    turnScreenOn: turnScreenOn,
    screenEnabled: screenEnabled
  };
})();
