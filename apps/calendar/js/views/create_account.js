define(function(require, exports, module) {
'use strict';

var Presets = require('common/presets');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var template = require('templates/account');

require('dom!create-account-view');

function CreateAccount(options) {
  View.apply(this, arguments);
  this.cancel = this.cancel.bind(this);
}
module.exports = CreateAccount;

CreateAccount.prototype = {
  __proto__: View.prototype,

  _changeToken: 0,

  presets: Presets,

  selectors: {
    element: '#create-account-view',
    accounts: '#create-account-presets',
    header: '#create-account-header'
  },

  get accounts() {
    return this._findElement('accounts');
  },

  get header() {
    return this._findElement('header');
  },

  _initEvents: function() {
    this._accountStream = core.bridge.observeAccounts();
    this._accountStream.listen(() => this.render());
    this.header.addEventListener('action', this.cancel);
  },

  destroy: function() {
    this._accountStream && this._accountStream.cancel();
    this.header.removeEventListener('action', this.cancel);
  },

  render: co.wrap(function *() {
    var presets = this.presets;
    var listElement = this.accounts;
    var currentToken = ++this._changeToken;

    listElement.innerHTML = '';

    function renderPreset(presetName) {
      listElement.insertAdjacentHTML(
        'beforeend',
        template.provider.render({ name: presetName })
      );
    }

    try {
      var available = yield core.bridge.availablePresets(presets);
      if (this._changeToken !== currentToken) {
        // another render call takes priority over this one.
        return;
      }
      available.forEach(renderPreset);
    } catch (err) {
      console.error('Error displaying presets', err);
    }
  }),

  onfirstseen: function() {
    // render will be called as a side-effect of _initEvents
    this._initEvents();
  },

  cancel: function() {
    window.history.back();
  }
};

});
