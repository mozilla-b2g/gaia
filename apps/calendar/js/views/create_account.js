(function(window) {

  var template = Calendar.Templates.Account;

  function CreateAccount(options) {
    Calendar.View.apply(this, arguments);
    this.cancel = this.cancel.bind(this);
    this._initEvents();
  }

  CreateAccount.prototype = {
    __proto__: Calendar.View.prototype,

    presets: Calendar.Presets,

    selectors: {
      element: '#create-account-view',
      accounts: '#create-account-presets',
      cancelButton: '#create-account-view .cancel'
    },

    get accounts() {
      return this._findElement('accounts');
    },

    get cancelButton() {
      return this._findElement('cancelButton');
    },

    _initEvents: function() {
      var self = this;
      var store = this.app.store('Account');

      // Here instead of bind
      // for inheritance / testing reasons.
      function render() {
        self.render();
      }

      store.on('remove', render);
      store.on('add', render);

      this.cancelButton.addEventListener('click', this.cancel);
    },

    render: function() {
      var list = this.presets;
      var store = this.app.store('Account');
      var output;

      this.accounts.innerHTML = '';

      Object.keys(list).forEach(function(preset) {
        var obj = list[preset];

        if (obj.singleUse) {
          if (store.presetActive(preset)) {
            return;
          }
        }

        output = template.provider.render({ name: preset });
        this.accounts.insertAdjacentHTML('beforeend', output);
      }, this);
    },

    cancel: function() {
      window.back();
    }
  };

  CreateAccount.prototype.onfirstseen = CreateAccount.prototype.render;
  Calendar.ns('Views').CreateAccount = CreateAccount;

}(this));
