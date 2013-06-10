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
      accountListHeader: '#advanced-settings-view .account-list-header',
      syncFrequency: '#setting-sync-frequency',

      standardAlarmLabel: '#default-event-alarm',
      alldayAlarmLabel: '#default-allday-alarm'
    },

    get accountList() {
      return this._findElement('accountList');
    },

    get accountListHeader() {
      return this._findElement('accountListHeader');
    },

    get syncFrequency() {
      return this._findElement('syncFrequency');
    },

    get standardAlarmLabel() {
      return this._findElement('standardAlarmLabel');
    },

    get alldayAlarmLabel() {
      return this._findElement('alldayAlarmLabel');
    },

    get standardAlarm() {
      return this.standardAlarmLabel.querySelector('select');
    },

    get alldayAlarm() {
      return this.alldayAlarmLabel.querySelector('select');
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
      account.on('preRemove', this._removeAccount.bind(this));

      setting.on('syncFrequencyChange', this);
      this.syncFrequency.addEventListener('change', this);

      this.standardAlarmLabel.addEventListener('change', this);
      this.alldayAlarmLabel.addEventListener('change', this);
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
        case 'alldayAlarmDefault':
        case 'standardAlarmDefault':
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
      if (!this._displayAccount(model)) {
        return;
      }

      // Before we add this, ensure that the account list header
      // is being shown since we could be the first child
      this.accountListHeader.classList.add('active');

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
        /** @type {Node} */
        var parentNode = el.parentNode;
        parentNode.removeChild(el);

        // When we remove this, it's possible that there aren't
        // any accounts left, so we should check that and possibly
        // remove the account list header.
        if (parentNode.childNodes.length === 0) {
          this.accountListHeader.classList.remove('active');
        }
      }
    },

    render: function() {
      var self = this;
      var pending = 4;

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
        self.accountListHeader.classList.remove('active');
        self.accountList.innerHTML = '';

        for (var id in accounts) {
          self._addAccount(id, accounts[id]);
        }

        next();
      }

      function renderAlarmDefault(type) {
        return function(err, value) {

          var element = type + 'AlarmLabel';
          var existing = self[element].querySelector('select');

          if (existing) {
            existing.parentNode.removeChild(existing);
          }

          // Render the select box
          var template = Calendar.Templates.Alarm;
          var select = document.createElement('select');
          select.name = type + 'AlarmDefault';
          select.innerHTML = template.options.render({
            layout: type,
            trigger: value
          });
          self[element].querySelector('.button').appendChild(select);

          next();
        };
      }

      var settings = this.app.store('Setting');
      var accounts = this.app.store('Account');

      settings.getValue('syncFrequency', renderSyncFrequency);
      settings.getValue('standardAlarmDefault', renderAlarmDefault('standard'));
      settings.getValue('alldayAlarmDefault', renderAlarmDefault('allday'));
      accounts.all(renderAccounts);
    }

  };

  AdvancedSettings.prototype.onfirstseen = AdvancedSettings.prototype.render;
  Calendar.ns('Views').AdvancedSettings = AdvancedSettings;

}(this));
