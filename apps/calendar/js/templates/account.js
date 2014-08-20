(function(window) {
  'use strict';

  var Account = Calendar.Template.create({
    provider: function() {
      var name = this.h('name');
      return `<li class="${name}">
          <a data-l10n-id="preset-${name}"
             data-provider="${name}" href="/create-account/${name}">
          </a>
        </li>`;
    },

    account: function() {
      var id = this.h('id');
      var preset = this.h('preset');
      var user = this.h('user');

      return `<li id="account-${id}">
          <a href="/update-account/${id}">
            <span class="preset" data-l10n-id="preset-${preset}"></span>
            <span class="user">${user}</span>
          </a>
        </li>`;
    }
  });

  Calendar.ns('Templates').Account = Account;

}(this));
