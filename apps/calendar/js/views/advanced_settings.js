define(function(require, exports, module) {
'use strict';

var AlarmTemplate = require('templates/alarm');
var Local = require('provider/local');
var View = require('view');
var calendarObserver = require('calendar_observer');
var debug = require('debug')('views/advanced_settings');
var forEach = require('object').forEach;
var providerFactory = require('provider/provider_factory');
var template = require('templates/account');

require('dom!advanced-settings-view');

var ACCOUNT_PREFIX = 'account-';

function AdvancedSettings(options) {
  View.apply(this, arguments);

  this._loadingCalendarList = true;
  this._addAccount = this._addAccount.bind(this);
  this._updateAccount = this._updateAccount.bind(this);
  this._removeAccount = this._removeAccount.bind(this);
  this._renderCalendarSelect = this._renderCalendarSelect.bind(this);
  this.onCreateAccount = this.onCreateAccount.bind(this);

  this._initEvents();
}
module.exports = AdvancedSettings;

AdvancedSettings.prototype = {
  __proto__: View.prototype,

  selectors: {
    element: '#advanced-settings-view',
    accountList: '#advanced-settings-view .account-list',
    createAccountButton: '#advanced-settings-view .create-account',
    accountListHeader: '#advanced-settings-view .account-list-header',
    syncFrequency: '#setting-sync-frequency',
    defaultCalendar: '#setting-default-calendar',
    standardAlarmLabel: '#default-event-alarm',
    alldayAlarmLabel: '#default-allday-alarm'
  },

  get accountList() {
    return this._findElement('accountList');
  },

  get createAccountButton() {
    return this._findElement('createAccountButton');
  },

  get accountListHeader() {
    return this._findElement('accountListHeader');
  },

  get syncFrequency() {
    return this._findElement('syncFrequency');
  },

  get defaultCalendar() {
    return this._findElement('defaultCalendar');
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
    // XXX: Here for l10n
    return {
      id: model._id,
      preset: model.preset,
      user: model.user,
      hasError: !!model.error
    };
  },

  _displayAccount: function(account) {
    var provider = providerFactory.get(account.providerType);
    return provider.hasAccountSettings;
  },

  _initEvents: function() {
    var account = this.app.store('Account');
    var setting = this.app.store('Setting');
    account.on('add', this._addAccount);
    account.on('update', this._updateAccount);
    account.on('preRemove', this._removeAccount);
    setting.on('syncFrequencyChange', this);
    setting.on('defaultCalendarChange', this);
    calendarObserver.on('change', this._renderCalendarSelect);
    this.createAccountButton.addEventListener('click', this.onCreateAccount);
    this.syncFrequency.addEventListener('change', this);
    this.defaultCalendar.addEventListener('change', this);
    this.standardAlarmLabel.addEventListener('change', this);
    this.alldayAlarmLabel.addEventListener('change', this);
  },

  handleSettingDbChange: function(type, value) {
    switch (type) {
      case 'defaultCalendarChange':
        // TODO(gareth)
        break;
      case 'syncFrequencyChange':
        this.syncFrequency.value = String(value);
        break;
    }
  },

  handleSettingUiChange: function(type, value) {
    debug('Will change db setting for', type, 'to', value);
    var store = this.app.store('Setting');
    // basic conversions
    if (value === 'null') {
      value = null;
    }

    switch (type) {
      case 'alldayAlarmDefault':
      case 'standardAlarmDefault':
      case 'syncFrequency':
        if (value !== null) {
          value = parseInt(value);
        }
        break;
    }

    return store.set(type, value);
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'change':
        var target = event.target;
        this.handleSettingUiChange(target.name, target.value);
        break;
      case 'defaultCalendarChange':
      case 'syncFrequencyChange':
        this.handleSettingDbChange(event.type, event.data[0]);
        break;
    }
  },

  onCreateAccount: function(event) {
    event.stopPropagation();
    event.preventDefault();
    this.app.router.show(event.target.getAttribute('href'));
  },

  _addAccount: function(id, model) {
    if (!this._displayAccount(model)) {
      return;
    }

    var idx = this.accountList.children.length;
    var item = template.account.render(this._formatModel(model));
    this.accountList.insertAdjacentHTML('beforeend', item);

    if (model.error) {
      this.accountList.children[idx].classList.add('error');
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

    if (el.classList.contains('error') && !model.error) {
      el.classList.remove('error');
    }

    if (model.error) {
      el.classList.add('error');
    }
  },

  _removeAccount: function(id) {
    var el = document.getElementById(this.idForModel(ACCOUNT_PREFIX, id));

    if (el) {
      /** @type {Node} */
      var parentNode = el.parentNode;
      parentNode.removeChild(el);
    }
  },

  onfirstseen: function() {
    if (this._loadingCalendarList) {
      this.defaultCalendar.classList.add(this.LOADING);
    }
  },

  _renderCalendarSelect: function(calendarList) {
    // TODO(gareth): This method is mostly shared with
    //     views/modify_event. Should consolidate somehow.
    var setting = this.app.store('Setting');
    setting.getValue('defaultCalendar', defaultCalendar => {
      var element = this.defaultCalendar;
      element.innerHTML = '';
      forEach(calendarList, (id, object) => {
        var calendar = object.calendar;
        var capabilities = object.capabilities;
        if (!calendar.localDisplayed || !capabilities.canCreateEvent) {
          return;
        }

        var l10n = navigator.mozL10n;
        var option = document.createElement('option');
        if (id === Local.calendarId) {
          option.text = l10n.get('calendar-local');
          option.setAttribute('data-l10n-id', 'calendar-local');
        } else {
          option.text = calendar.remote.name;
        }

        option.value = id;
        if (defaultCalendar != null) {
          option.selected = (defaultCalendar === id);
        }

        element.add(option);

        if (this._loadingCalendarList) {
          this._loadingCalendarList = false;
          this.defaultCalendar.classList.add(this.LOADING);
        }
      });
    });
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
      var elements = Array.prototype.slice.call(self.accountList
                                          .getElementsByClassName('user'));
      elements.forEach(function(element) {
        element.parentChild.removeChild(element);
      });

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
        var template = AlarmTemplate;
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

});
