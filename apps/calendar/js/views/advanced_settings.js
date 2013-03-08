(function(window) {

  var template = Calendar.Templates.Account;

  function AdvancedSettings(options) {
    Calendar.View.apply(this, arguments);

    this._initEvents();
  }

  AdvancedSettings.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#advanced-settings-view',
      accountList: '#advanced-settings-view .account-list',
      syncFrequency: '#setting-sync-frequency'
    },

    get accountList() {
      return this._findElement('accountList');
    },

    get syncFrequency() {
      return this._findElement('syncFrequency');
    },

    _formatModel: function(model) {
      //XXX: Here for l10n
      return {
        id: model._id,
        preset: model.preset,
        user: model.user
      };
    },

    _displayAccount: function(account) {
      var provider = this.app.provider(account.providerType);
      return provider.hasAccountSettings;
    },

    _initEvents: function() {
      var account = this.app.store('Account');
      var setting = this.app.store('Setting');

      account.on('add', this._addAccount.bind(this));
      account.on('remove', this._removeAccount.bind(this));

      setting.on('syncFrequencyChange', this);
      this.syncFrequency.addEventListener('change', this);
    },

    handleSettingDbChange: function(type, value) {
      switch (type) {
        case 'syncFrequencyChange':
          this.syncFrequency.value = String(value);
          break;
      }
    },

    handleSettingUiChange: function(type, value) {
      var store = this.app.store('Setting');
      // basic conversions
      if (value === 'null')
        value = null;

      switch (type) {
        case 'syncFrequency':
          if (!value === null) {
            value = parseInt(value);
          }
          store.set(type, value);
          break;
      }
    },

    handleEvent: function(event) {
      switch (event.type) {
        case 'change':
          var target = event.target;
          this.handleSettingUiChange(target.name, target.value);
          break;
        case 'syncFrequencyChange':
          this.handleSettingDbChange(event.type, event.data[0]);
          break;
      }
    },

    _addAccount: function(id, model) {
      if (!this._displayAccount(model))
        return;

      var item = template.account.render(
        this._formatModel(model)
      );

      this.accountList.insertAdjacentHTML('beforeend', item);
    },

    _removeAccount: function(id) {
      var htmlId = 'account-' + id;
      var el = document.getElementById(htmlId);

      if (el) {
        el.parentNode.removeChild(el);
      }
    },

    render: function() {
      var self = this;
      var pending = 2;

      function next() {
        if (!--pending && self.onrender) {
          self.onrender();
        }
      }

      function renderSyncFrequency(err, value) {
        self.syncFrequency.value = String(value);
        next();
      }

      function renderAccounts(err, accounts) {
        self.accountList.innerHTML = '';

        for (var id in accounts) {
          self._addAccount(id, accounts[id]);
        }

        next();
      }

      var settings = this.app.store('Setting');
      var accounts = this.app.store('Account');

      settings.getValue('syncFrequency', renderSyncFrequency);
      accounts.all(renderAccounts);
    }

  };

  AdvancedSettings.prototype.onfirstseen = AdvancedSettings.prototype.render;
  Calendar.ns('Views').AdvancedSettings = AdvancedSettings;

}(this));
