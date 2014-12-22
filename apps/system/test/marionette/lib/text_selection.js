'use strict';

var Actions = require('marionette-client').Actions;
function TextSelection(client) {
  this.client = client;
  this._activeContent = null;
  this.actions = new Actions(this.client);
}

module.exports = TextSelection;

TextSelection.Selector = Object.freeze({
  textSelectionDialog: '.textselection-dialog',
  copy: '.textselection-dialog .textselection-dialog-copy',
  paste: '.textselection-dialog .textselection-dialog-paste',
  cut: '.textselection-dialog .textselection-dialog-cut',
  selectall: '.textselection-dialog .textselection-dialog-selectall'
});

TextSelection.prototype = {
  /**
   * Get dialog width from previous operation.
   */
  get width() {
    // We need to make sure we're in system app before getting
    // dialog's location.
    this.client.switchToFrame();
    var size = this.client.helper.waitForElement(
      TextSelection.Selector.textSelectionDialog).size();
    this.client.apps.switchToApp(this._getDisplayedAppInfo().origin);
    return size.width;
  },

  /**
   * Get dialog position from previous operation.
   */
  get location() {
    this.client.switchToFrame();
    var location = this.client.helper.waitForElement(
      TextSelection.Selector.textSelectionDialog).location();
    this.client.apps.switchToApp(this._getDisplayedAppInfo().origin);
    return location;
  },

  /**
   * Get appWindow's id and origin of displayed app.
   * XXXXX: Since gecko is not ready yet, we need to simulate gecko dispatching
   *        mozbrowsertextualmenu event to display textselection dialog.
   * 
   * @return {displayApp}.
   */
  _getDisplayedAppInfo: function() {
    // AppWindow information is stored in system app scope.
    var displayApp;
    this.client.waitFor(function() {
      displayApp = this.client.executeScript(function() {
        var app = window.wrappedJSObject.Service.currentApp;
        var frame = (app.browser) ? app.browser.element : app.frame.firstChild;
        return {
          appWindowId: frame.id,
          origin: app.origin
        };
      });
      return displayApp;
    }.bind(this));
    return displayApp;
  },

  longPress: function(element) {
    this.actions.tap(element, 10, 10).wait(2).longPress(element, 2).perform();
  },

  pressCopy: function() {
    this.client.switchToFrame();
    this.client.helper.waitForElement(TextSelection.Selector.copy).tap();
    this.client.apps.switchToApp(this._getDisplayedAppInfo().origin);
  },

  pressCut: function() {
    this.client.switchToFrame();
    this.client.helper.waitForElement(TextSelection.Selector.cut).tap();
    this.client.apps.switchToApp(this._getDisplayedAppInfo().origin);
  },

  pressPaste: function() {
    this.client.switchToFrame();
    this.client.helper.waitForElement(TextSelection.Selector.paste).tap();
    this.client.apps.switchToApp(this._getDisplayedAppInfo().origin);
  },

  pressSelectAll: function() {
    this.client.switchToFrame();
    this.client.helper.waitForElement(TextSelection.Selector.selectall).tap();
    this.client.apps.switchToApp(this._getDisplayedAppInfo().origin);
  }
};
