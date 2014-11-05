/**
 * Asks the user to re-enter their password for the account
 */
'use strict';
define(function(require) {
  return [
    require('./base')(require('template!./setup_fix_password.html')),
    require('./setup_fix_mixin')
  ];
});
