(function(window) {

  var ACCOUNT_PREFIX = 'account-';
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
        user: model.user,
        hasError: !!model.error
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
      account.on('update', this._updateAccount.bind(this));
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

      var idx = this.accountList.children.length;
      var item = template.account.render(this._formatModel(model));
      this.accountList.insertAdjacentHTML('beforeend', item);

      if (model.error) {
        this.accountList.children[idx].classList.add(Calendar.ERROR);
      }
    },

    _updateAccount: function(id, model) {
      var elementId = this.idForModel(ACCOUNT_PREFIX, id);
      var el = document.getElementById(elementId);
      if (!el) {
        return console.error(
          'trying to update account that was not rendered',
          id,
          elementId
        );
      }

      if (el.classList.contains(Calendar.ERROR) && !model.error) {
        el.classList.remove(Calendar.ERROR);
      }

      if (model.error) {
        el.classList.add(Calendar.ERROR);
      }
    },

    _removeAccount: function(id) {
      var el = document.getElementById(this.idForModel(ACCOUNT_PREFIX, id));

      if (el) {
        el.parentNode.removeChild(el);
      }
    },

    render: function() {
      var accounts = this.app.store('Account');
      var items = accounts.cached;
      var list = this.accountList;

      // update accounts

      var key;
      var result = '';

      for (key in items) {
        this._addAccount(key, items[key]);
      }

      var settings = this.app.store('Setting');

      // update settings

      // we only have on setting right now this will change
      // and we should have a sane abstraction over multiple
      // types of settings...
      var syncFrequency = this.syncFrequency;
      settings.getValue('syncFrequency', function(err, value) {
        syncFrequency.value = String(value);
      });
    }

  };

  AdvancedSettings.prototype.onfirstseen = AdvancedSettings.prototype.render;
  Calendar.ns('Views').AdvancedSettings = AdvancedSettings;

}(this));
