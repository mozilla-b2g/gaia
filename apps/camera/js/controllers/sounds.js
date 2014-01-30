define(function(require, exports, module) {
'use strict';

/**
 * Exports
 */

exports = module.exports = function(app) { return new SoundsController(app); };
exports.SoundsController = SoundsController;

/**
 * Initialize a new `SoundsController`
 * @param {[type]} app [description]
 */
function SoundsController(app) {
  this.sounds = app.sounds;
  app.on('change:recording', this.onRecordingChange);
  app.on('camera:shutter', this.sounds.player('shutter'));
}

/**
 * Plays the start/end recording sound.
 *
 * @private
 */
SoundsController.prototype.onRecordingChange = function(recording) {
  if (recording) { this.sounds.play('recordingStart'); }
  else { this.sounds.play('recordingEnd'); }
};

});
