define(function(require, exports, module) {
'use strict';

var create = require('template').create;

module.exports = create({
  provider: function() {
    var name = this.h('name');
    return `<li class="${name}" role="presentation">
        <a data-l10n-id="preset-${name}" role="option" dir="auto"
           data-provider="${name}" href="/create-account/${name}">
        </a>
      </li>`;
  },

  account: function() {
    var id = this.h('id');
    var preset = this.h('preset');
    var user = this.h('user');

    return `<li id="account-${id}" role="presentation">
        <a href="/update-account/${id}" role="option" dir="auto">
          <span class="preset" data-l10n-id="preset-${preset}"></span>
          <span class="user">${user}</span>
        </a>
      </li>`;
  }
});

});
