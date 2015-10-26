/* exported MockPlayerView */
'use strict';

var MockPlayerView = {
  get isQueued() { return true; },
  currentFileInfo: { metadata: {} },
  playingBlob: { type: null },

  init: function() {},
  stop: function() {},
};
