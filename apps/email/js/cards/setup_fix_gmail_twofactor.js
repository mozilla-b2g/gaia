'use strict';
define(function(require) {
  return [
    require('./base')(require('template!./setup_fix_gmail_twofactor.html')),
    require('./setup_fix_mixin')
  ];
});
