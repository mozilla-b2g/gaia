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
      .findElement('button.save')
      .click();
  }
};
