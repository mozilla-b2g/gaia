(function(window) {

  var template = Calendar.Templates.Account;

  function CreateAccount(options) {
    Calendar.View.apply(this, arguments);
    this.cancel = this.cancel.bind(this);
    this._initEvents();
  }

  CreateAccount.prototype = {
    __proto__: Calendar.View.prototype,

    _changeToken: 0,

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
      var presets = this.presets;
      var store = this.app.store('Account');
      var listElement = this.accounts;
      var currentToken = ++this._changeToken;

      listElement.innerHTML = '';

      function renderPreset(presetName) {
        listElement.insertAdjacentHTML(
          'beforeend',
          template.provider.render({ name: presetName })
        );
      }

      store.availablePresets(presets, function(err, available) {
        if (this._changeToken !== currentToken) {
          // another render call takes priority over this one.
          return;
        }

        if (err) {
          console.log('Error displaying presets', err);
          return;
        }

        available.forEach(renderPreset);

        if (this.onrender)
          this.onrender();

      }.bind(this));
    },

    cancel: function() {
      window.back();
    }
  };

  CreateAccount.prototype.onfirstseen = CreateAccount.prototype.render;
  Calendar.ns('Views').CreateAccount = CreateAccount;

}(this));
