/**
 * UI for Addons panel's functionality.
 *
 * @module AddonsList
 */
define(function(require) {
  'use strict';

  var ListView = require('modules/mvvm/list_view');
  var AddonItemTemplateFactory = require('panels/addons/addons_template');

  function AddonsList(root, manager) {
    this._enabled = false;
    this._listRoot = root;
    this._addonsManager = manager;
    var addonTemplate = AddonItemTemplateFactory({
      disableAddon: this._addonsManager.disableAddon,
      enableAddon: this._addonsManager.enableAddon
    });
    this._listView = ListView(this._listRoot,
      this._addonsManager.addons, addonTemplate);
  }

  AddonsList.prototype = {
    set enabled(value) {
      if (value !== this._enabled) {
        this._listView.enabled = this._enabled = value;
      }
    }
  };

  return function ctor_addons_list(root, manager) {
    return new AddonsList(root, manager);
  };
});
