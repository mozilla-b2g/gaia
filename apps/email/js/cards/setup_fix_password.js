/**
 * Asks the user to re-enter their password for the account
 */
'use strict';
define(function(require) {
  return [
    require('./base_card')(require('template!./setup_fix_password.html')),
    require('./setup_fix_mixin')
  ];
});
