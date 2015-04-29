define(function(require, exports, module) {
'use strict';

var Presets = require('common/presets');
var View = require('view');
var template = require('templates/account');

require('dom!create-account-view');

function CreateAccount(options) {
  View.apply(this, arguments);
  this.cancel = this.cancel.bind(this);
  this._initEvents();
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
    var self = this;
    var store = this.app.store('Account');

    // Here instead of bind
    // for inheritance / testing reasons.
    function render() {
      self.render();
    }

    store.on('remove', render);
    store.on('add', render);

    this.header.addEventListener('action', this.cancel);
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
        return console.error('Error displaying presets', err);
      }

      available.forEach(renderPreset);

      if (this.onrender) {
        this.onrender();
      }

    }.bind(this));
  },

  cancel: function() {
    window.history.back();
  }
};

CreateAccount.prototype.onfirstseen = CreateAccount.prototype.render;

});
