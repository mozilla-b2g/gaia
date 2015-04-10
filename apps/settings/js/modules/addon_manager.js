/**
 * AddonManager is a singleton with methods for querying the currently
 * installed addons, enabling, disabling, and uninstalling addons, and
 * for obtaining a list of apps targeted by a specified add-on. It also
 * emits events when the set of installed addons has changed.
 *
 * AddonManager uses the AppsCache module for efficient access to the full
 * list of installed apps.
 */
/* global MozActivity */
define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');
  var mozApps = require('modules/navigator/mozApps');

  // This is the AddonManager API
  var AddonManager = {
    getAddons: getAddons,               // returns promise<app[]>
    isAddon: isAddon,                   // returns true or false for app
    isEnabled: isEnabled,               // returns true or false for addon
    enableAddon: enableAddon,           // pass an addon object to enable
    disableAddon: disableAddon,         // pass an addon to disable
    canDelete: canDelete,               // returns true or false for addon
    deleteAddon: deleteAddon,           // pass an app, returns promise
    shareAddon: shareAddon,             // returns a promise
    getAddonTargets: getAddonTargets,   // pass an app, returns a promise<app[]>
    addEventListener: addListener,      // For event type "addonschanged"
    removeEventListener: removeListener
  };

  function getManifest(app) {
    return app.manifest || app.updateManifest;
  }

  function isAddon(app) {
    var manifest = getManifest(app);
    return manifest && manifest.role === 'addon';
  }

  function getAddons() {
    return AppsCache.apps().then(function(apps) {
      return apps.filter(isAddon);
    });
  }

  function isEnabled(addon) {
    return isAddon(addon) && addon.enabled === true;
  }

  function enableAddon(addon) {
    if (isAddon(addon)) {
      mozApps.mgmt.setEnabled(addon, true);
    }
  }

  //
  // Disable the specified addon, then return a promise that resolves
  // to one of the strings "reboot", "restart" and "disabled".
  // These strings have the following meanings:
  //
  // reboot: the addon injected a script into a system app and the user
  //  may need to reboot to fully disable the addon.
  //
  // restart: the addon injected a script into an app and that app
  //  may need to be restarted (if it is currently running) in order
  //  to fully disable the addon.
  //
  // disabled: the addon was CSS only or did not affect any apps and it is 
  //  fully diasbled.
  //
  function disableAddon(addon) {
    if (isAddon(addon)) {
      mozApps.mgmt.setEnabled(addon, false);
    } else {
      return Promise.reject('not an addon');
    }

    return getCustomizedApps(addon).then(function(customizedApps) {
      var needsReboot = customizedApps.some(function(customizedApp) {
        var manifest = getManifest(customizedApp.app);
        var role = manifest.role;
        // If the addon affects a system app
        if (role === 'system' || role === 'homescreen') {
          // and the app is customized with a script, then we need reboot
          return customizedApp.customizations.some((c) => c.scripts.length > 0);
        } else {
          return false;
        }
      });

      if (needsReboot) {
        return 'reboot';
      }

      var needsRestart = customizedApps.some(function(customizedApp) {
        return customizedApp.customizations.some((c) => c.scripts.length > 0);
      });

      if (needsRestart) {
        return 'restart';
      }

      return 'disabled';
    });
  }

  function canDelete(addon) {
    return isAddon(addon) && addon.removable === true;
  }

  function deleteAddon(addon) {
    if (!isAddon(addon)) {
      return Promise.reject('not an addon');
    }

    if (!addon.removable) {
      return Promise.reject('addon is not deletable');
    }

    return new Promise(function(resolve, reject) {
      var request = mozApps.mgmt.uninstall(addon);
      request.onsuccess = function() {
        resolve();
      };
      request.onerror = function() {
        reject();
      };
    });
  }

  function shareAddon(addon) {
    if (!isAddon(addon)) {
      return Promise.reject('not an addon');
    }

    return new Promise(function(resolve, reject) {
      var activity = new MozActivity({
        name: 'share',
        data: {
          type: 'app',
          app: addon.manifestURL
        }
      });

      activity.onsuccess = function() {
        resolve();
      };
      activity.onerror = function() {
        reject((activity.error && activity.error.name) || 'activity error');
      };
    });
  }

  // Return an array of the apps that are targeted by any of this
  // addon's customizations. Note, however, that addons can also target
  // arbitrary web pages and hosted apps. This test only applies to
  // installed packaged apps and so may be of limited utility.
  function getAddonTargets(addon) {
    return getCustomizedApps(addon).then(function(customizedApps) {
      return customizedApps.map((x) => x.app);
    });
  }

  // Addons can only apply to apps with the same or lower privilege
  function privilegeCheck(addonManifest, appManifest) {
    return addonManifest.type === appManifest.type ||
      addonManifest.type === 'certified' ||
      (addonManifest.type === 'privileged' && appManifest.type !== 'certified');
  }

  // This internal utility function returns an array of objects describing
  // the apps that are affected by this addon. Each object in the array has
  // an 'app' property that holds the app object and an 'customizations'
  // property that is an array of customizations (from the addon manifest).
  // We implement getAddonTargets() using this information and also derive
  // the 'reboot' and 'restart' return values of disableAddon() from it.
  //
  // We need to keep this code in sync with the matching gecko
  // code in dom/apps/UserCustomizations.jsm so that our list of
  // targeted apps actually matches the apps that Gecko injects
  // the addon into.
  //
  // This function is surprisingly slow. On a Flame with 70 apps, it
  // takes about 50ms from the time the function is called until the
  // returned promise resolves. If this turns out to be a problem in
  // practice, we should modify this module to cache the results.
  //
  function getCustomizedApps(addon) {
    if (!isAddon(addon)) {
      return Promise.reject('not an addon');
    }

    var addonManifest = getManifest(addon);
    var customizations = addonManifest && addonManifest.customizations;

    // If the addon does not specify any customizations, then we know
    // that it does not target any apps
    if (!customizations || customizations.length === 0) {
      return Promise.resolve([]);
    }

    // Get a list of all installed apps
    return AppsCache.apps().then(function(apps) {
      var customizedApps = []; // This is the array of we'll return

      // For each customization, compile the filter string into a regexp
      var filters = customizations.map((c) => new RegExp(c.filter));

      // Now loop through the apps and see which are affected by this addon
      apps.forEach(function(app) {
        var appManifest = getManifest(app);

        // Ignore apps that are themselves add-ons
        // XXX: Will themes have a role, and should we ignore them too?
        if (appManifest.role === 'addon') {
          return;
        }

        // If the addon doesn't have high enough privileges to affect this app
        // then we can just return now.
        if (!privilegeCheck(addonManifest, appManifest)) {
          return;
        }

        // Get the URL of the app manifest plus its launch path to
        // compare against each of the filters.
        // XXX: Note that we and do not check the paths used by
        // activity handlers or any other paths in the manifest.
        var launchPath = appManifest.launch_path || '';
        var launchURL = new URL(launchPath, app.manifestURL).href;
        var appliedCustomizations = [];

        // Now loop through the filters to see what customizations are
        // applied to this app
        for(var i = 0; i < filters.length; i++) {
          var filter = filters[i];
          if (filter.test(launchURL)) {
            appliedCustomizations.push(customizations[i]);
            break;
          }
        }

        // If any customizations were applied to this app, then add it
        // to the list of customizedApps
        if (appliedCustomizations.length > 0) {
          customizedApps.push({
            app: app,
            customizations: appliedCustomizations
          });
        }
      });

      return customizedApps;
    });
  }

  var eventListeners = {
    addonschanged: []
  };

  function addListener(type, listener) {
    if (eventListeners[type]) {
      eventListeners[type].push(listener);
    }
  }

  function removeListener(type, listener) {
    if (eventListeners[type]) {
      var index = eventListeners[type].indexOf(listener);
      if (index >= 0) {
        eventListeners[type].splice(index, 1);
      }
    }
  }

  // Register the event handlers we need so that we can send our own events
  AppsCache.addEventListener('oninstall', appsChangedHandler);
  AppsCache.addEventListener('onuninstall', appsChangedHandler);

  function appsChangedHandler(event) {
    // We only care if the installed or removed app was an addon
    if (isAddon(event.application)) {
      eventListeners.addonschanged.forEach(function(listener) {
        listener(event);
      });
    }
  }

  return AddonManager;
});
