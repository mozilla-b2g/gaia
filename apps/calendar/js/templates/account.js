(function(window) {

  var Account = Calendar.Template.create({
    provider: function() {
      return '<li class="' + this.h('name') + '">' +
          '<a ' +
            'data-l10n-id="preset-' + this.h('name') + '" ' +
            'data-provider="' + this.h('name') + '" href="/create-account/' +
              this.h('name') + '">' +
            this.l10n('name', 'preset-') +
          '</a>' +
        '</li>';
    },

    account: function() {
      var id = this.h('id');

      return '<li id="account-' + id + '">' +
          '<a href="/update-account/' + id + '">' +
            '<span class="preset"' +
              ' data-l10n-id="preset-' + this.h('preset') + '">' +
              this.l10n('preset', 'preset-') +
            '</span>' +
            '<span class="user">' + this.h('user') + '</span>' +
          '</a>' +
        '</li>';
    }
  });

  Calendar.ns('Templates').Account = Account;

}(this));
