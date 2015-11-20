'use strict';

var fs = require('fs');
var assert = require('assert');

/**
 * @param {Marionette.Client} client Marionette client to use.
 * @constructor
 */
function MarionetteA11y(client) {
  this.client = client;
  this.axe = fs.readFileSync(__dirname + '/node_modules/axe-core/axe.min.js',
    'utf8');
  this.axe += 'axe.a11yCheck(document, {' +
    'rules: {' +
      '"document-title": { enabled: false },' +
      '"meta-viewport": { enabled: false },' +
      '"bypass": { enabled: false }' +
    '}}, function(results) {' +
      'marionetteScriptFinished(results.violations);' +
    '});';
}
module.exports = MarionetteA11y;

/**
 * Make a new a11y checker.
 * @param {Marionette.Client} client Marionette client to use.
 * @param {Object} options map of named args for the plugin.
 * @return {MarionetteA11y} instance.
 */
MarionetteA11y.setup = function(client, options) {
  return new MarionetteA11y(client);
};

MarionetteA11y.prototype = {
  /**
   * @type {Marionette.Client}
   */
  client: null,

  /**
   * Run an accessibility check of the current document.
   * If there are violations, the check will assert.
   */
  check: function MarionetteA11y_check() {
    this.client.executeAsyncScript(this.axe, function(error, violations) {
      assert.ifError(error, 'Error running accessibility check');
      assert(violations.length === 0, violations.map(function(violation) {
        return [
          violation.discription,
          violation.nodes.reduce(function(str, node) {
            return str + node.target.join(' ');
          }, ''),
          violation.help
        ].join(' : ');
      }).join('\n'));
    });
  }
};
