'use strict';
define(function(require) {
  return [
    require('./base_card')
           (require('template!./setup_fix_gmail_twofactor.html')),
    require('./setup_fix_mixin')
  ];
});
