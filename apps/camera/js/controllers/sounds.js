define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:sounds');
var Sounds = require('lib/sounds');

/**
 * Exports
 */

module.exports = function(app) { return new SoundsController(app); };
module.exports.SoundsController = SoundsController;

/**
 * Initialize a new `SoundsController`
 *
 * @param {App} app [description]
 */
function SoundsController(app) {
  var list = app.settings.sounds.get('list');
  this.sounds = new Sounds(list);
  this.app = app;
  this.bindEvents();
  debug('initialized');
}

SoundsController.prototype.bindEvents = function() {
  this.app.on('change:recording', this.onRecordingChange.bind(this));
  this.app.on('camera:willrecord', this.sounds.player('recordingStart'));
  this.app.on('camera:shutter', this.sounds.player('shutter'));
  this.app.on('timer:immanent', this.sounds.player('timer'));
};

/**
 * Plays the start/end recording sound.
 *
 * @private
 */
SoundsController.prototype.onRecordingChange = function(recording) {
  if (!recording) {
    this.sounds.play('recordingEnd');
  }
};

});
