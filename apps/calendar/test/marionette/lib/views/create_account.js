'use strict';

var View = require('./view');

function CreateAccount() {
  View.apply(this, arguments);
}
module.exports = CreateAccount;

CreateAccount.prototype = {
  __proto__: View.prototype,

  selector: '#create-account-view',

  createCalDavAccount: function() {
    this
      .findElement('a[href="/create-account/caldav"]')
      .click();
  }
};
