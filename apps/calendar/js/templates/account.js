(function(window) {

  var Account = Calendar.Template.create({
    provider: function() {
      return '<li class="' + this.h('name') + '">' +
          '<a data-provider="' + this.h('name') + '" href="/create-account/' + this.h('name') + '">' +
            this.l10n('name', 'preset-') +
          '</a>' +
        '</li>';
    },

    account: function() {
      return '<li id="account-' + this.h('id') + '">' +
          '<a href="/update-account/' + this.h('id') + '">' +
            '<span class="preset">' + this.l10n('preset', 'preset-') + '</span>' +
            '<span class="user">' + this.h('user') + '</span>' +
          '</a>' +
        '</li>';
    }
  });

  Calendar.ns('Templates').Account = Account;

}(this));
