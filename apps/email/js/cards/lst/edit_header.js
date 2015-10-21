'use strict';

define(function(require, exports) {
  var mozL10n = require('l10n!');

  return [
    require('../base')(require('template!./edit_header.html')),
    require('../mixins/dom_evt'),
    {
      updateDomHeaderCount: function(count) {
        mozL10n.setAttributes(this.headerNode, 'message-multiedit-header',
          { n: count });
      }
    }
  ];
});
