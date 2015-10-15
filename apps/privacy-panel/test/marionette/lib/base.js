'use strict';
/**
 * Base app object to provide common methods to app objects
 *
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Base(client, origin) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.origin = origin || 'app://privacy-panel.gaiamobile.org';
}

module.exports = Base;

Base.prototype = {

  /**
   * Launches privacy-panel app.
   */
  launch: function() {
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
    this.client.helper.waitForElement('body[data-ready="true"]');
  },

  /**
   * Switches back to the current app frame.
   * Useful when switching to system frame during test and needs to switch back.
   */
  switchTo: function(origin) {
    this.client.switchToFrame();
    this.client.apps.switchToApp(origin);
  },

  /**
   * @protected
   * @param {String} name of selector
   */
  waitForElement: function(name) {
    return this.client.helper.waitForElement(name);
  },

  /**
   * Waits for panel to dissapear, due to transition and transform we need to
   * be sure element is not in the viewport range.
   *
   * @protected
   * @param {String} name of selector
   */
  waitForPanelToDissapear: function(name) {
    this.client.waitFor(function() {
      var rect = this.client.findElement(name).scriptWith(function(element) {
        return element.getBoundingClientRect();
      });
      return rect.right <= 0 || rect.left >= rect.width;
    }.bind(this));
  },

  /**
   * @protected
   * @param {String} name of selector
   */
  waitForPanel: function(name) {
    var element = this.waitForElement(name);
    this.client.waitFor(function() {
      var loc = element.location();
      return loc.x === 0;
    });
  },

  /**
   * Use to select an options as currently we are not able to tap on a select
   * element. Please refer to bug 977522 for details.
   *
   * @protected
   * @param {String} name of selector.
   * @param {String} text content of an option
   */
  tapSelectOption: function(name, optionText) {
    this.client.helper.tapSelectOption(name, optionText);
  }
};
