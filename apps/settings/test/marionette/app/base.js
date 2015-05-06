'use strict';
/**
 * Base app object to provide common methods to app objects
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Base(client, origin, selectors) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.origin = origin;
  this.selectors = selectors;
}

module.exports = Base;

Base.prototype = {

  /**
   * Launches settings app, switches to frame, and waits for it to be loaded.
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
  switchTo: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(this.origin);
  },

  /**
   * @protected
   * @param {String} name of selector [its a key in Settings.Selectors].
   */
  findElement: function(name) {
    return this.client.findElement(this.selectors[name]);
  },

  /**
   * @protected
   * @param {String} name of selector [its a key in Settings.Selectors].
   */
  findElements: function(name) {
    return this.client.findElements(this.selectors[name]);
  },

  /**
   * @protected
   * @param {String} name of selector [its a key in Settings.Selectors].
   */
  waitForElement: function(name) {
    var element = this.client.helper.waitForElement(this.selectors[name]);
    this.client.waitFor(function() {
      return element.scriptWith(function(el) {
        var style = window.getComputedStyle(el);
        return style.visibility === 'visible';
      });
    }.bind(this));
    return element;
  },

  /**
   * Use to select an options as currently we are not able to tap on a select
   * element. Please refer to bug 977522 for details.
   *
   * @protected
   * @param {String} name of selector [its a key in Settings.Selectors].
   * @param {String} text content of an option
   */
  tapSelectOption: function(name, optionText) {
    this.client.helper.tapSelectOption(this.selectors[name], optionText);
  }
};
