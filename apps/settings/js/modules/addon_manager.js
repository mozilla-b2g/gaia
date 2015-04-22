/**
 * AddonManager is a singleton with methods for querying the currently
 * installed addons, enabling, disabling, and uninstalling addons, and
 * for obtaining a list of apps targeted by a specified add-on. It also
 * emits events when the set of installed addons has changed and when
 * the set of installed apps has changed (because this might affect the
 * set of targeted apps for an addon).
 *
 * AddonManager uses the AppsCache module for efficient access to the full
 * list of installed apps.
 */
/* global MozActivity */
define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');

  // This is the AddonManager API
  var AddonManager = {
    // returns promise<app[]>
    getAddons: getAddons,
    // returns true or false for app
    isAddon: isAddon,
    // returns true or false for addon
    isEnabled: isEnabled,
    // pass an addon object to enable
    enableAddon: enableAddon,
    // pass an addon to disable
    disableAddon: disableAddon,
    // returns true or false for addon
    canDelete: canDelete,
    // pass an app, returns promise
    deleteAddon: deleteAddon,
    // returns a promise
    shareAddon: shareAddon,
    // pass an app, returns a promise<app[]>
    getAddonTargets: getAddonTargets,
    // for event type "addonschanged"
    addEventListener: addListener,
    removeEventListener: removeListener,
    // returns an addon with matching manifest URL
    findAddonByManifestURL: findAddonByManifestURL,
    // pass an app, returns a promise that resolves when the addon is renamed
    renameAddon: renameAddon
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

  function findAddonByManifestURL(manifestURL) {
    return AppsCache.apps().then(function(apps) {
      return apps.find(function(app) {
        return isAddon(app) && app.manifestURL === manifestURL;
      });
    });
  }

  function isEnabled(addon) {
    return isAddon(addon) && addon.enabled;
  }

  function enableAddon(addon) {
    if (isAddon(addon)) {
      navigator.mozApps.mgmt.setEnabled(addon, true);
    }
  }

  function disableAddon(addon) {
    if (isAddon(addon)) {
      navigator.mozApps.mgmt.setEnabled(addon, false);
    }
  }

  function canDelete(addon) {
    return isAddon(addon) && addon.removable;
  }

  function deleteAddon(addon) {
    if (!isAddon(addon)) {
      return Promise.reject('not an addon');
    }

    if (!addon.removable) {
      return Promise.reject('addon is not deletable');
    }

    return new Promise(function(resolve, reject) {
      var request = navigator.mozApps.mgmt.uninstall(addon);
      request.onsuccess = function() {
        resolve();
      };
      request.onerror = function() {
        reject();
      };
    });
  }

  function renameAddon(addon, name) {
    if (!name) {
      return Promise.reject('no name given');
    }

    if (!isAddon(addon)) {
      return Promise.reject('not an addon');
    }

    var manifest = getManifest(addon);
    if (name === manifest.name) {
      return Promise.reject('name is unchanged');
    }

    var newManifest, addonBlob;
    // To rename an addon we are creating a new DOMApplication that will have
    // an updated name. Other manifest attributes are preserved.
    // Export an add-on as a blob.
    return addon.export().then(function(blob) {
      addonBlob = blob;
      // Copy over manifest object.
      newManifest = Object.assign({}, manifest);
      newManifest.name = name;
      // Delete original add-on.
      return deleteAddon(addon);
    }).then(function() {
      // Covert exported add-on into an Array Buffer.
      return blobToArrayBuffer(addonBlob);
    }).then(unpackScript).then(function(script) {
      // Generate a new add-on using the original manifest and a new name.
      return generate(newManifest, script);
    }).then(install);
  }

  function unpackScript(arrayBuffer) {
    return getJSZip().then(function(JSZip) {
      var zip = new JSZip();
      zip.load(arrayBuffer);

      var applicationZipFile = zip.file('application.zip');
      if (!applicationZipFile) { return; }

      var applicationZip = new JSZip();
      applicationZip.load(applicationZipFile.asArrayBuffer());

      var scriptFile = applicationZip.file('main.js');
      if (!scriptFile) { return; }

      return(scriptFile.asText());
    });
  }

  function generate(manifest, script) {
    return getJSZip().then(function(JSZip) {
      var id = 'addon' + Math.round(Math.random() * 100000000);
      var applicationZip = new JSZip();

      // Ensure that we are creating an addon with a new id.
      manifest.role = 'addon';
      manifest.type = 'certified';
      manifest.origin = 'app://' + id + '.gaiamobile.org';
      manifest.activities = manifest.activities || {};

      applicationZip.file('manifest.webapp', JSON.stringify(manifest));
      applicationZip.file('main.js', script);

      var packageZip = new JSZip();
      packageZip.file('metadata.json', JSON.stringify({
        installOrigin: 'http://gaiamobile.org',
        manifestURL: 'app://' + id + '.gaiamobile.org/update.webapp',
        version: 1
      }));
      packageZip.file('update.webapp', JSON.stringify({
        name: manifest.name,
        package_path: '/application.zip'
      }));
      packageZip.file('application.zip',
        applicationZip.generate({ type: 'arraybuffer' }));

      return new Blob([packageZip.generate({ type: 'arraybuffer' })],
        { type: 'application/zip' });
    });
  }

  function blobToArrayBuffer(blob) {
    return new Promise(function(resolve, reject) {
      var fileReader = new FileReader();
      fileReader.onload = function() {
        resolve(fileReader.result);
      };
      fileReader.onerror = function(reason) {
        reject(reason);
      };
      fileReader.readAsArrayBuffer(blob);
    });
  }

  function getJSZip() {
    // Lazily require jszip. It is currently used only for renaming Add-ons.
    return new Promise(function(resolve) {
      require(['jszip'], resolve);
    });
  }

  function install(blob) {
    // Import the addon using memory-backed blob.
    return navigator.mozApps.mgmt.import(blob).then(function (addon) {
      // Enable the addon by default.
      enableAddon(addon);
      return addon;
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
        reject(activity.error.name);
      };
    });
  }

  // Addons can only apply to apps with the same or lower privilege
  function privilegeCheck(addon, app) {
    var addonManifest = getManifest(addon);
    var appManifest = getManifest(app);
    return addonManifest.type === appManifest.type ||
      addonManifest.type === 'certified' ||
      (addonManifest.type === 'privileged' && appManifest.type !== 'certified');
  }

  //
  // We need to keep this code in sync with the matching gecko
  // code in dom/apps/UserCustomizations.jsm so that our list of
  // targeted apps actually matches the apps that Gecko injects
  // the addon into.
  //
  function getAddonTargets(addon) {
    if (!isAddon(addon)) {
      return Promise.reject('not an addon');
    }

    var manifest = getManifest(addon);
    var customizations = manifest && manifest.customizations;

    // If the addon does not specify any customizations, then we know
    // that it does not target any apps
    if (!customizations || customizations.length === 0) {
      return Promise.resolve([]);
    }

    // Get a list of all installed apps
    return AppsCache.apps().then(function(apps) {
      // For each customization, compile the filter string into a regexp
      var filters = [];
      customizations.forEach(function(customization) {
        var filterText = customization && customization.filter;
        if (filterText) {
          filters.push(new RegExp(filterText));
        }
      });

      var targets = []; // This is the array of matching apps we'll return

      // Now loop through the apps and see which are affected by this addon
      apps.forEach(function(app) {
        var manifest = getManifest(app);

        // Ignore apps that have a role property because they are add-ons
        // or themes or system apps, etc. and we don't want them listed.
        if (manifest.role) {
          return;
        }

        // If the addon doesn't have high enough privileges to affect this app
        // then we can just return now.
        if (!privilegeCheck(addon, app)) {
          return;
        }

        // Get the URL of the app origin plus its launch path to
        // compare against each of the filters.
        // XXX: Note that we and do not check the paths used by
        // activity handlers or any other paths in the manifest.
        var launchPath = manifest.launch_path || '';
        var launchURL = new URL(launchPath, app.origin).href;

        // Now loop through the filters to see if this url matches at least one
        for(var i = 0; i < filters.length; i++) {
          var filter = filters[i];
          if (filter.test(launchURL)) {
            targets.push(app);
            break;
          }
        }
      });

      return targets;
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
