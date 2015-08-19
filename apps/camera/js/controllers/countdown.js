define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:countdown');
var CountdownView = require('views/countdown');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new CountdownController(app); };
module.exports.CountdownController = CountdownController;

/**
 * Create a new `CountdownController`
 *
 * @param {App} app
 */
function CountdownController(app) {
  bindAll(this);
  this.app = app;
  this.view = app.views.countdown || new CountdownView(); // test hook
  this.view.appendTo(app.el);
  this.bindEvents();
  debug('initialized');
}

/**
 * Connects the countdown view
 * with the app via events.
 *
 * @private
 */
CountdownController.prototype.bindEvents = function() {
  this.app.on('countdown:started', this.start);
  this.app.on('countdown:tick', this.update);
  this.app.on('countdown:ended', this.clear);
};

CountdownController.prototype.start = function(seconds) {
  this.update(seconds);
  this.view.show();
  debug('started');
};

CountdownController.prototype.update = function(seconds) {
  if (seconds < 1) { seconds = ''; }
  var immanent = seconds <= 3;

  this.view
    .set(seconds)
    .setImmanent(immanent);

  if (immanent && seconds > 0) { this.app.emit('countdown:immanent'); }
};

CountdownController.prototype.clear = function() {
  this.view.hide(this.view.reset);
};

});
