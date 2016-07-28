define(function(require, exports, module) {
'use strict';

// this module abstracts minute and day changes, it should be used by all the
// views that needs to listen for time changes (ie. update current time/date).
// listeners are enabled/disabled when the document visibility changes,
// reducing battery usage and making sure we always display the proper value.
// ---
// XXX: we don't listen to moztimechange here because the app forces a restart
// when the time changes; even if the app did not restart we would still need
// to trigger a refresh of most of the views (timezone affects the way we
// busytimes are rendered in all the views, even the view/edit event views)
// see: https://bugzilla.mozilla.org/show_bug.cgi?id=1093016#c9

var EventEmitter2 = require('ext/eventemitter2');

exports = module.exports = new EventEmitter2();

exports.on = function() {
  EventEmitter2.prototype.on.apply(this, arguments);
  this._start();
};

exports.once = function() {
  EventEmitter2.prototype.once.apply(this, arguments);
  this._start();
};

exports.off = function() {
  EventEmitter2.prototype.off.apply(this, arguments);
  this._autoStop();
};

exports.removeAllListeners = function() {
  EventEmitter2.prototype.removeAllListeners.apply(this, arguments);
  this._autoStop();
};

exports._autoStop = function() {
  if (!this._hasListeners()) {
    this._stop();
  }
};

exports._hasListeners = function() {
  return this.listeners('day').length > 0 ||
    this.listeners('minute').length > 0;
};

exports._timeout = null;
exports._prevTick = null;

exports._start = function() {
  if (this._timeout || !this._hasListeners()) {
    return;
  }
  this._prevTick = new Date();
  this._timeout = setTimeout(this._tick, this._nextMinute());
};

exports._stop = function() {
  if (this._timeout) {
    window.clearTimeout(this._timeout);
    this._timeout = null;
  }
};

exports._tick = function() {
  this._stop();
  this._exec();
  this._start();
}.bind(exports);

exports._nextMinute = function() {
  var now = new Date();
  return (60 - now.getSeconds()) * 1000;
};

exports._exec = function() {
  var now = new Date();
  var prev = this._prevTick;
  if (prev.getMinutes() !== now.getMinutes()) {
    this.emit('minute');
  }
  if (prev.getDate() !== now.getDate()) {
    this.emit('day');
  }
};

exports.init = function() {
  document.addEventListener('visibilitychange', () => {
    exports._toggleStatusOnVisibilityChange(document.hidden);
  });
  exports._start();
};

exports._toggleStatusOnVisibilityChange = function(hidden) {
  // we trigger an update as soon as document is visible to avoid issues with
  // timer not being fired (eg. timer was disabled and day/minute changed while
  // app was hidden)
  if (!hidden) {
    exports._exec();
  }
  var method = hidden ? '_stop' : '_start';
  exports[method]();
};

});
