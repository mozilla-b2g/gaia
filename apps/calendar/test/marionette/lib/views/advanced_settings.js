'use strict';

var View = require('./view');

function AdvancedSettings() {
  View.apply(this, arguments);
}
module.exports = AdvancedSettings;

AdvancedSettings.prototype = {
  __proto__: View.prototype,

  selector: '#advanced-settings-view',

  close: function() {
    this
      .findElement('a[href="/settings/"]')
      .click();
  },

  createAccount: function() {
    this
      .findElement('[href="/select-preset/"]')
      .click();
  },

  clickAccount: function(calendarName, user) {
    var account;
    this
      .findElements('.account-list > li')
      .some(function(element) {
        var text = element.text();
        if (text.indexOf(calendarName) !== -1 ||
            (user && text.indexOf(user) !== -1)) {
          account = element;
          return true;
        }
      });

    if (!account) {
      throw new Error(
        'Could not find account for user ' + user +
        ' or calendar ' + calendarName
      );
    }

    account.click();
  },

  waitForHide: function() {
    return this.client.waitFor(function() {
      var zIndex = this
        .getElement()
        .cssProperty('z-index');
      return zIndex === '-1';
    }.bind(this));
  }
};
