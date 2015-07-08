/* exported MockModeManager, MODE_LIST, MODE_TILES, MODE_PLAYER, MODE_PICKER,
   MODE_SEARCH_FROM_TILES, SETTINGS_OPTION_KEY */
'use strict';

var MODE_LIST = 0;
var MODE_TILES = 1;
var MODE_PLAYER = 2;
var MODE_PICKER = 3;
var MODE_SEARCH_FROM_TILES = 5;

var SETTINGS_OPTION_KEY = 'settings_option_key';

var MockModeManager = {
  get currentMode() {
    return 0;
  },
  start: function() {},
  push: function() {}
};


