'use strict';

var View = require('./view');

function CreateAccount() {
  View.apply(this, arguments);
}
module.exports = CreateAccount;

CreateAccount.prototype = {
  __proto__: View.prototype,

  selector: '#create-account-view',

  /**
   * @param {String} accountType is one of
   *     'google', 'yahoo', or 'caldav'.
   */
  chooseAccountType: function(accountType) {
    var selector = '.' + accountType;
    this
      .findElement(selector)
      .click();
  }
};
