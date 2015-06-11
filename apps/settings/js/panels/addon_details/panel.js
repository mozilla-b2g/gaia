define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AddonManager = require('modules/addon_manager');
  var AddonDetails = require('panels/addon_details/addon_details');
  var SettingsService = require('modules/settings_service');
  var DialogService = require('modules/dialog_service');
  var Toaster = require('shared/toaster');
  var ManifestHelper = require('shared/manifest_helper');

  return function ctor_addon_details_panel() {
    return SettingsPanel({
      onInit: function(panel) {
        this._elements = {
          body: panel.querySelector('.addon-details-body'),
          header: panel.querySelector('.addon-details-header'),
          gaiaHeader: panel.querySelector('gaia-header'),
          enabledState: panel.querySelector('.addon-enabled-state'),
          name: panel.querySelector('.addon-details-name'),
          icon: panel.querySelector('.addon-details-icon'),
          description: panel.querySelector('.addon-description-text'),
          developer: panel.querySelector('.addon-developer'),
          targetsList: panel.querySelector('.addon-targets'),
          toggle: panel.querySelector('.addon-enabled'),
          deleteButton: panel.querySelector('.addon-delete'),
          renameButton: panel.querySelector('.addon-rename')
        };
        this._details = AddonDetails(this._elements);
        this._boundOnAppEnabledChange = this._onAppEnabledChange.bind(this);

        // Hook up the enable/disable toggle button
        this._elements.toggle.onchange = this._onToggleChange.bind(this);
        // Hook up the delete button
        this._elements.deleteButton.onclick = this._onDelete.bind(this);
        // Hook up the rename button
        this._elements.renameButton.onclick = this._onRename.bind(this);
      },

      onBeforeShow: function(panel, options) {
        return Promise.resolve((() => {
          if (options.addon) {
            return options.addon;
          } else if (options.manifestURL) {
            return AddonManager.findAddonByManifestURL(options.manifestURL);
          }
        })()).then((addon) => {
          this._curAddon = addon;

          // set initial state
          if (this._curAddon) {
            this._details.render({
              app: this._curAddon,
              // Renaming should only be available from activity.
              isActivity: !options.addon
            });
            this._elements.toggle.checked =
              AddonManager.isEnabled(this._curAddon);
            this._curAddon.observe('enabled', this._boundOnAppEnabledChange);
            this._elements.deleteButton.disabled =
              !AddonManager.canDelete(this._curAddon);
            this._elements.body.hidden = false;
          } else {
            console.error('No valid add-on');
            this._elements.body.hidden = true;
          }

          this._elements.gaiaHeader.hidden = false;
        });
      },

      onHide: function() {
        // Scroll back to the top
        this._elements.body.scrollTop = 0;

        if (this._curAddon) {
          this._curAddon.unobserve('enabled', this._boundOnAppEnabledChange);
          this._curAddon = null;
        }
      },

      _showStepsRequired(type) {
        // If an addon injected a script then we have to restart any
        // affected apps. And if those apps are system apps, then we
        // need to reboot the device.
        if (type === 'reboot') {
          // XXX We could do a confirm dialog here asking the user if
          // they want to go ahead and reboot the device now.
          Toaster.showToast({
            messageL10nId: 'addon-reboot-required',
            latency: 3000,
            useTransition: true
          });
        } else if (type === 'restart') {
          Toaster.showToast({
            messageL10nId: 'addon-restart-apps-to-disable',
            latency: 3000,
            useTransition: true
          });
        }
      },

      _onAppEnabledChange: function(enabled) {
        this._elements.toggle.checked = enabled;
        if (!enabled) {
          AddonManager.getAddonDisableType(this._curAddon).then(
            this._showStepsRequired);
        }
      },

      _onToggleChange: function() {
        if (this._elements.toggle.checked) {
          AddonManager.enableAddon(this._curAddon);
        } else {
          AddonManager.disableAddon(this._curAddon);
        }
      },

      _onDelete: function() {
        this._elements.deleteButton.disabled = true; // don't delete it twice!
        var disableType;
        AddonManager.getAddonDisableType(this._curAddon).then(type => {
          disableType = type;
          return AddonManager.deleteAddon(this._curAddon);
        }).then(() => {
          this._showStepsRequired(disableType);
          SettingsService.navigate('addons'); /* go back*/
        }).catch(reason => {
          console.error('Addon deletion failed:', reason);
          // If the user cancelled deletion, we need to reenable the button
          this._elements.deleteButton.disabled = false;
        });
      },

      _onRename: function() {
        var manifest = new ManifestHelper(this._curAddon.instance.manifest ||
          this._curAddon.instance.updateManifest);

        DialogService.prompt('addon-rename-desc', {
          title: 'addon-rename-input',
          defaultValue: manifest.name,
          submitButton: 'ok',
          cancelButton: 'cancel'
        }).then(result => {
          var type = result.type;
          if (type !== 'submit') { return; }

          var value = result.value.trim();
          if (!value) { return; }

          AddonManager.renameAddon(this._curAddon, value).then(addon => {
            // Renaming succeeded, only update the name where necessary.
            // Addon manager will update the list automatically.
            this._curAddon = addon;
            this._details.updateNames(new ManifestHelper(
              addon.instance.manifest || addon.instance.updateManifest));
          }).catch(reason => {
            // Renaming failed
            console.error('Addon renaming failed:', reason);
          });
        });
      }
    });
  };
});
