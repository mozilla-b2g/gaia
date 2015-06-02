/**
 * UI for Addons panel's functionality.
 *
 * @module AddonsList
 */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var ListView = require('modules/mvvm/list_view');
  var AddonItemTemplateFactory = require('panels/addons/addons_template');
  var ObservableArray = require('modules/mvvm/observable_array');

  function AddonsList(root, manager) {
    this._enabled = false;
    this._listRoot = root;
    this._addonManager = manager;
    this._addons = ObservableArray(this._addonManager.addons.array);

    ['insert', 'remove'].forEach(e =>
      this._addonManager.addons.addEventListener(e, this._update.bind(this)));

    var addonTemplate = AddonItemTemplateFactory(function onClick(addon) {
      SettingsService.navigate('addon-details', { addon: addon });
    });

    this._listView = ListView(this._listRoot, this._addons, addonTemplate);
  }

  AddonsList.prototype = {
    set enabled(value) {
      if (value !== this._enabled) {
        this._listView.enabled = this._enabled = value;
      }
    },

    _update: function() {
      return this._filter ?
        Promise.all(this._addonManager.addons.array.map(addon =>
          this._addonManager.addonAffectsApp(addon, this._filter).then(
            affects => affects ? addon : undefined))).then(
              addons => this._addons.reset(addons.filter(addon => addon))) :
        Promise.resolve(this._addons.reset(this._addonManager.addons.array));
    },

    setFilter: function(manifestURL) {
      if (!manifestURL) {
        return Promise.resolve();
      }
      this._filter = manifestURL;
      return this._update();
    },

    unsetFilter: function() {
      if (!this._filter) {
        return Promise.resolve();
      }
      delete this._filter;
      return this._update();
    }
  };

  return function ctor_addons_list(root, manager) {
    return new AddonsList(root, manager);
  };
});
