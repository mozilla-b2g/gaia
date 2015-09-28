/* exported MockModeManager, MODE_LIST, MODE_SUBLIST, MODE_TILES, MODE_PLAYER,
   MODE_PICKER, MODE_SEARCH_FROM_TILES, MODE_SEARCH_FROM_LIST,
   SETTINGS_OPTION_KEY */
'use strict';

var MODE_LIST = 0;
var MODE_TILES = 1;
var MODE_PLAYER = 2;
var MODE_SUBLIST = 3;
var MODE_SEARCH_FROM_TILES = 5;
var MODE_SEARCH_FROM_LIST = 6;
var MODE_PICKER = 7;

var SETTINGS_OPTION_KEY = 'settings_option_key';

var MockModeManager = {

  _view: null,

  get currentMode() {
    return 0;
  },
  start: function() {},
  push: function() {},
  waitForView: function(mode, callback) {
    assert.ok(this._view, 'You didn\'t set MockModeManager._view');
    callback(this._view);
  }
};


