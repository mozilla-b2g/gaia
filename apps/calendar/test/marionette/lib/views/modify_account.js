'use strict';

var View = require('./view');

function ModifyAccount() {
  View.apply(this, arguments);
}
module.exports = ModifyAccount;

ModifyAccount.prototype = {
  __proto__: View.prototype,

  selector: '#modify-account-view',

  get form() {
    return this.findElement('form');
  },

  set user(value) {
    this.setFormValue('user', value);
  },

  set password(value) {
    this.setFormValue('password', value);
  },

  set fullUrl(value) {
    this.setFormValue('fullUrl', value);
  },

  save: function() {
    this
      .findElement('.save')
      .click();
  },

  delete: function() {
    this
      .findElement('.delete-record')
      .click();

    this.client.waitFor(function() {
      var confirm = this.findElement('.delete-confirm');
      if (!confirm.displayed()) {
        return false;
      }

      confirm.click();
      return true;
    }.bind(this));
  },

  /**
   * Workaround to wait for the modify account view to disappear.
   * Remove once https://bugzil.la/995563 is fixed.
   */
  waitForHide: function() {
    return this.client.waitFor(function() {
      var zIndex = this
        .getElement()
        .cssProperty('z-index');
      return zIndex === '-1';
    }.bind(this));
  }
};
