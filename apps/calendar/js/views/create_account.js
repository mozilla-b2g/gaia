(function(window) {

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  var template = Calendar.Templates.Account;

  function CreateAccount(options) {
    Calendar.View.apply(this, arguments);
  }

  CreateAccount.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#create-account-view',
      accounts: '#create-account-presets'
    },

    get accounts() {
      return this._findElement('accounts');
    },

    render: function() {
      var list = Calendar.Presets;
      var output;

      Object.keys(list).forEach(function(preset) {
        output = template.accountItem.render({ name: preset });
        this.accounts.insertAdjacentHTML('beforeend', output);
      }, this);
    }
  };

  CreateAccount.prototype.onfirstseen = CreateAccount.prototype.render;
  Calendar.Views.CreateAccount = CreateAccount;

}(this));
