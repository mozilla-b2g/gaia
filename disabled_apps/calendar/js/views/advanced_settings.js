define(function(require, exports, module) {
'use strict';

var AlarmTemplate = require('templates/alarm');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var dom = require('utils/dom');
var router = require('router');
var template = require('templates/account');

require('dom!advanced-settings-view');

function AdvancedSettings(options) {
  View.apply(this, arguments);
}
module.exports = AdvancedSettings;

AdvancedSettings.prototype = {
  __proto__: View.prototype,

  selectors: {
    element: '#advanced-settings-view',
    accountList: '#advanced-settings-view .account-list',
    createAccountButton: '#advanced-settings-view .create-account',
    syncFrequency: '#setting-sync-frequency',
    header: '#advanced-settings-header',
    standardAlarmLabel: '#default-event-alarm',
    alldayAlarmLabel: '#default-allday-alarm'
  },

  get accountList() {
    return this._findElement('accountList');
  },

  get createAccountButton() {
    return this._findElement('createAccountButton');
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

  get header() {
    return this._findElement('header');
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

  _initEvents: function() {
    var bridge = core.bridge;
    bridge.observeAccounts().listen(this._renderAccounts.bind(this));
    bridge.observeSetting('syncFrequency').listen(
      this._renderSyncFrequency.bind(this)
    );

    this.createAccountButton.addEventListener('click',
                                             this.onCreateAccount.bind(this));
    this.syncFrequency.addEventListener('change', this);

    this.standardAlarmLabel.addEventListener('change', this);
    this.alldayAlarmLabel.addEventListener('change', this);
  },

  handleSettingUiChange: function(type, value) {
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
        core.bridge.setSetting(type, value);
        break;
    }
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'change':
        var target = event.target;
        this.handleSettingUiChange(target.name, target.value);
        break;
    }
  },

  onCreateAccount: function(event) {
    event.stopPropagation();
    event.preventDefault();
    router.show(event.target.getAttribute('href'));
  },

  render: co.wrap(function *() {
    this.header.runFontFitSoon();

    // the accounts and syncFrequency are already handled by the _initEvents
    var bridge = core.bridge;
    var data = yield {
      standardAlarmDefault: bridge.getSetting('standardAlarmDefault'),
      alldayAlarmDefault: bridge.getSetting('alldayAlarmDefault')
    };

    this._renderAlarmDefault('standard', data.standardAlarmDefault);
    this._renderAlarmDefault('allday', data.alldayAlarmDefault);
  }),

  _renderSyncFrequency: function(value) {
    this.syncFrequency.value = String(value);
  },

  _renderAccounts: function(accounts) {
    this.accountList.innerHTML = '';

    accounts
    .filter(data => data.provider.hasAccountSettings)
    .forEach(data => {
      var model = data.account;
      var idx = this.accountList.children.length;
      var item = template.account.render(this._formatModel(model));
      this.accountList.insertAdjacentHTML('beforeend', item);

      if (model.error) {
        this.accountList.children[idx].classList.add('error');
      }
    });
  },

  _renderAlarmDefault: function(type, value) {
    var element = type + 'AlarmLabel';
    dom.removeElements(this[element].querySelector('select'));

    // Render the select box
    var template = AlarmTemplate;
    var select = document.createElement('select');
    select.name = type + 'AlarmDefault';
    select.innerHTML = template.options.render({
      layout: type,
      trigger: value
    });
    this[element].querySelector('.button').appendChild(select);
  },

  onfirstseen: function() {
    this._initEvents();
    this.render();
  }
};

});
