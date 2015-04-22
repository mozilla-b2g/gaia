define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var ManifestHelper = require('shared/manifest_helper');
  var AppIconHelper = require('modules/app_icon_helper');
  var AddonManager = require('modules/addon_manager');
  var DialogService = require('modules/dialog_service');

  function AddonDetails(panel) {
    this.panel = panel;
  }

  AddonDetails.prototype.render = function render(options) {
    // Renaming should only be available from activity.
    this.isActivity = !options.addon;
    if (options.addon) {
      this.renderAddon(options.addon);
    } else if (options.manifestURL) {
      // Lookup addon based on its manifestURL before rendering.
      AddonManager.findAddonByManifestURL(options.manifestURL).then(
        this.renderAddon.bind(this));
    }
  };

  AddonDetails.prototype.renderAddon = function renderAddon(app) {
    var l10n = navigator.mozL10n;
    this.app = app;
    this.noRename = !this.isActivity || !AddonManager.canDelete(app);
    var manifest = new ManifestHelper(app.manifest || app.updateManifest);

    // Utility function for finding elements in the panel
    var panel = this.panel;
    function $(selector) { return panel.querySelector(selector); }

    // Scroll back to the top
    var detailsBody = $('#addon-details-body');
    detailsBody.classList.toggle('no-rename', this.noRename);
    detailsBody.scrollTop = 0;
    detailsBody.hidden = false;

    // Display the name of the add-on in the panel header
    var appnameArgs = { appName: manifest.name };
    var header = $('#addon-details-header');
    l10n.setAttributes(header, 'addon-details-name', appnameArgs);
    header.hidden = false;
    var name = $('#addon-name');
    l10n.setAttributes(name, 'addon-details-name', appnameArgs);

    // Put an icon next to the description
    var iconElement = $('#addon-detail-icon');
    iconElement.src = AppIconHelper.getIconURL(app, 64);
    l10n.setAttributes(iconElement, 'accessible-app-icon', appnameArgs);

    // Display the add-on description if there is one
    var description = manifest.description;
    var descriptionElement = $('#addon-description-text');
    if (description) {
      // If we have a description, the ManifestHelper class returned the
      // best localized version from the manifest file.
      descriptionElement.removeAttribute('data-l10n-id');
      descriptionElement.textContent = description;
    }
    else {
      // If there is no description, then display "no description" or similar.
      descriptionElement.setAttribute('data-l10n-id', 'addon-no-description');
    }


    // Display the add-on developer name if there is one
    var developerName = manifest.developer && manifest.developer.name;
    var developerElement = $('#addon-developer');
    if (developerName) {
      developerElement.hidden = false;
      l10n.setAttributes(developerElement, 'addon-developer', {
        developerName: developerName
      });
    }
    else {
      developerElement.hidden = true;
    }

    // Get the list of targeted apps
    $('#addon-targets').textContent = '';  // Clear any old content here
    AddonManager.getAddonTargets(app).then(function(targets) {
      var names = [];
      targets.forEach(function(target) {
        var manifest = new ManifestHelper(target.manifest ||
                                          target.updateManifest);
        names.push(manifest.name);
      });

      names.sort();

      var container = $('#addon-targets');
      names.forEach(function(name) {
        var item = document.createElement('li');
        var para = document.createElement('p');
        para.textContent = name;
        item.appendChild(para);
        container.appendChild(item);
      });

      if (names.length === 0) {
        $('#addon-targets').hidden = true;
        $('#addon-no-targets').hidden = false;
      }
      else {
        $('#addon-targets').hidden = false;
        $('#addon-no-targets').hidden = true;
      }
    });

    // Hook up the enable/disable toggle button
    var toggle = $('#addon-enabled');
    toggle.checked = AddonManager.isEnabled(app); // set initial state
    toggle.onchange = function() {                // handle user changes
      if (toggle.checked) {
        AddonManager.enableAddon(app);
      }
      else {
        AddonManager.disableAddon(app);
      }
    };

    // Hook up the share button
    var shareButton = $('#addon-share');
    l10n.setAttributes(shareButton, 'addon-share');
    shareButton.disabled = false;
    shareButton.onclick = function() {
      AddonManager.shareAddon(app).catch(function(reason) {
        if (reason === 'NO_PROVIDER') {
          l10n.setAttributes(shareButton, 'addon-share-no-provider');
          shareButton.disabled = true;
        }
      });
    };

    // Hook up the rename button
    if (!this.noRename) {
      var self = this;
      $('#addon-rename').onclick = function onclick() {
        DialogService.prompt('addon-rename-desc', {
          title: 'addon-rename-input',
          defaultValue: manifest.name,
          submitButton: 'ok',
          cancelButton: 'cancel'
        }).then(function(result) {
          var type = result.type;
          if (type !== 'submit') { return; }

          var value = result.value.trim();
          if (!value) { return; }

          AddonManager.renameAddon(app, value).then(function(addon) {
            // Renaming succeeded, only update the name where necessary.
            // Addon manager will update the list automatically.
            self.app = app = addon;
            manifest = new ManifestHelper(app.manifest || app.updateManifest);

            var appnameArgs = { appName: manifest.name };
            l10n.setAttributes(header, 'addon-details-name', appnameArgs);
            l10n.setAttributes(name, 'addon-details-name', appnameArgs);
            l10n.setAttributes(iconElement, 'accessible-app-icon', appnameArgs);
          }).catch(function(reason) {
            // Renaming failed
            console.error('Addon renaming failed:', reason);
          });
        });
      };
    }

    // Hook up the delete button
    var deleteButton = $('#addon-delete');
    if (AddonManager.canDelete(app)) {
      deleteButton.disabled = false;
      deleteButton.onclick = function() {
        deleteButton.disabled = true; // don't delete it twice!
        AddonManager.deleteAddon(app).then(function() {
          SettingsService.navigate('addons');  // go back
        }, function(reason) {
          console.error('Addon deletion failed:', reason);
          // If the user cancelled deletion, we need to reenable the button
          deleteButton.disabled = false;
        });
      };
    }
    else {
      deleteButton.disabled = true;
    }
  };

  return function ctor_addon_details(panel) {
    return new AddonDetails(panel);
  };
});
