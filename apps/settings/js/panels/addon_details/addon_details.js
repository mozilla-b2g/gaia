define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var ManifestHelper = require('shared/manifest_helper');
  var AppIconHelper = require('modules/app_icon_helper');
  var AddonManager = require('modules/addon_manager');
  var Toaster = require('shared/toaster');

  function AddonDetails(panel) {
    this.panel = panel;
    this.body = panel.querySelector('.addon-details-body');
    this.header = panel.querySelector('.addon-details-header');
    this.icon = panel.querySelector('.addon-details-icon');
    this.description = panel.querySelector('.addon-description-text');
    this.developer = panel.querySelector('.addon-developer');
    this.targetsList = panel.querySelector('.addon-targets');
    this.noTargetsMsg = panel.querySelector('.addon-no-targets');
    this.toggle = panel.querySelector('.addon-enabled');
    this.deleteButton = panel.querySelector('.addon-delete');
  }

  AddonDetails.prototype.render = function render(app) {
    var self = this;
    var l10n = navigator.mozL10n;
    this.app = app;
    var manifest = new ManifestHelper(app.manifest || app.updateManifest);

    // Scroll back to the top
    this.body.scrollTop = 0;

    // Display the name of the add-on in the panel header
    var appnameArgs = { appName: manifest.name };
    l10n.setAttributes(this.header, 'addon-details-header', appnameArgs);

    // Put an icon next to the description
    this.icon.src = AppIconHelper.getIconURL(app, 64 * window.devicePixelRatio);
    l10n.setAttributes(this.icon, 'accessible-app-icon', appnameArgs);

    // Display the add-on description if there is one
    if (manifest.description) {
      // If we have a description, the ManifestHelper class returned the
      // best localized version from the manifest file.
      this.description.removeAttribute('data-l10n-id');
      this.description.textContent = manifest.description;
    }
    else {
      // If there is no description, then display "no description" or similar.
      this.description.setAttribute('data-l10n-id', 'addon-no-description');
    }

    // Display the add-on developer name if there is one
    var developerName = manifest.developer && manifest.developer.name;
    if (developerName) {
      this.developer.hidden = false;
      l10n.setAttributes(this.developer, 'addon-developer', {
        developerName: developerName
      });
    }
    else {
      this.developer.hidden = true;
    }

    // Get the list of targeted apps
    this.targetsList.textContent = '';  // Clear any old content here
    AddonManager.getAddonTargets(app).then(function(targets) {
      var names = [];
      targets.forEach(function(target) {
        var manifest = new ManifestHelper(target.manifest ||
                                          target.updateManifest);
        names.push(manifest.name);
      });

      names.sort();

      names.forEach(function(name) {
        var item = document.createElement('li');
        var para = document.createElement('p');
        para.textContent = name;
        item.appendChild(para);
        self.targetsList.appendChild(item);
      });

      if (names.length === 0) {
        self.targetsList.hidden = true;
        self.noTargetsMsg.hidden = false;
      }
      else {
        self.targetsList.hidden = false;
        self.noTargetsMsg.hidden = true;
      }
    });

    // Hook up the enable/disable toggle button
    this.toggle.checked = AddonManager.isEnabled(app); // set initial state
    this.toggle.onchange = function() {                // handle user changes
      if (self.toggle.checked) {
        AddonManager.enableAddon(app);
      }
      else {
        AddonManager.disableAddon(app).then(function(status) {
          // If an addon injected a script then we have to restart any
          // affected apps. And if those apps are system apps, then we
          // need to reboot the device.
          if (status === 'reboot') {
            // XXX We could do a confirm dialog here asking the user if
            // they want to go ahead and reboot the device now.
            Toaster.showToast({
              messageL10nId: 'addon-reboot-required',
              latency: 3000,
              useTransition: true
            });
          }
          else if (status === 'restart') {
            Toaster.showToast({
              messageL10nId: 'addon-restart-apps-to-disable',
              latency: 3000,
              useTransition: true
            });
          }
        });
      }
    };

    // Hook up the delete button
    if (AddonManager.canDelete(app)) {
      this.deleteButton.disabled = false;
      this.deleteButton.onclick = function() {
        self.deleteButton.disabled = true; // don't delete it twice!
        AddonManager.deleteAddon(app).then(function() {
          SettingsService.navigate('addons');  // go back
        }, function(reason) {
          console.error('Addon deletion failed:', reason);
          // If the user cancelled deletion, we need to reenable the button
          self.deleteButton.disabled = false;
        });
      };
    }
    else {
      this.deleteButton.disabled = true;
    }
  };

  return function ctor_addon_details(panel) {
    return new AddonDetails(panel);
  };
});
