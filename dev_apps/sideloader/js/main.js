function displayInstalledApps() {

  function clickHandler(app) {
    return function() {
      exportAppToSDCard(app);
    };
  }

  var appMgr = navigator.mozApps.mgmt;
  appMgr.getAll().onsuccess = function(event) {
    var apps = event.target.result;
    var container = document.querySelector("#exportAppList");
    container.innerHTML = "";
    for (var app of apps) {
      if (app.manifest.type == 'certified')
        continue;

      var entryNode = createAppEntryNode(app);

      entryNode.querySelector('a').onclick = clickHandler(app)

      container.appendChild(entryNode);
    }
  }
}

function exportAppToSDCard(app) {
  navigator.mozApps.mgmt.export(app).then(function(blob) {
    var filename = app.origin.split('/')[2].split(':')[0] + '.wpk';
    console.log('writing', filename, blob)
    var sdcard = navigator.getDeviceStorage('sdcard');
    var request = sdcard.addNamed(blob, 'backup/apps/' + filename);

    request.onsuccess = function () {
      // Yay.
      console.log('Wrote ', filename, 'to SD card');
    };

    request.onerror = function () {
      console.warn('Unable to write the file: ' + this.error.name);
    };
  }, function(reason) {
    console.log('Broken promise exporting ', app.manifest.name, ':', reason);
  });
}

function fileIsApp(file) {
  return file.type == 'x-application/webapp-package' ||
         /\.wpk$/.test(file.name)
}

function getSDCardApps(cb) {
  var sdcard = navigator.getDeviceStorage('sdcard');
  var cursor = sdcard.enumerate('backup/apps');
  var apps = [];
  cursor.onsuccess = function () {
    var file = this.result;

    if (file && fileIsApp(file)) {
      apps.push(file)
    }

    if (!this.done) {
      this.continue();
    }
    else {
      cb(apps)
    }
  }

  cursor.onerror = function () {
    // And that's fine.
    console.warn("No backup/apps found on SD card: " + this.error);
  };
}

function displaySDCardApps() {

  var appMgr = navigator.mozApps.mgmt;

  function clickHandler(file) {
    return function() {
      appMgr.import(file).then(function(nada) {
        // Yay.
        console.log('Imported ', file.name, 'from SD card');
      }, function(reason) {
        // TODO: enumerate reasons -> user feedback
        // * already installed
        // * what else?
        console.log('Broken promise importing app', file.name, reason);
      });
    };
  }

  getSDCardApps(function(files) {
    var container = document.querySelector("#importAppList");
    container.innerHTML = "";
    files.forEach(function(file) {
      appMgr.getAppManifest(file).then(function(manifest) {
        var entryNode = createAppEntryNode({manifest: manifest});
        entryNode.querySelector('a').onclick = clickHandler(file);
        container.appendChild(entryNode);
      });
    });
  });
}

function createAppEntryNode(app) {
  var template = document.querySelector('#appListEntry').
                          content.cloneNode(true),
      link = template.querySelector('a'),
      manifest = app.manifest,
      iconURL = getBestIconURL(app, manifest.icons);

  link.appendChild(document.createTextNode(manifest.name));
  template.querySelector('img').src = iconURL;
  return template;
}

// TODO: hook up displays to tab events, remove install/uninstall listeners
document.addEventListener('DOMContentLoaded', function() {
  var appMgr = navigator.mozApps.mgmt;
  appMgr.oninstall = displayInstalledApps;
  appMgr.onuninstall = displayInstalledApps;
  displayInstalledApps();
  displaySDCardApps();
});

// Copied from app permissions list in Settings
// TODO: move into shared?
function getBestIconURL(app, icons) {
  if (!icons || !Object.keys(icons).length) {
    return 'style/images/default.png';
  }

  // The preferred size is 30 by the default. If we use HDPI device, we may
  // use the image larger than 30 * 1.5 = 45 pixels.
  var preferredIconSize = 30 * (window.devicePixelRatio || 1);
  var preferredSize = Number.MAX_VALUE;
  var max = 0;

  for (var size in icons) {
    size = parseInt(size, 10);
    if (size > max) {
      max = size;
    }

    if (size >= preferredIconSize && size < preferredSize) {
      preferredSize = size;
    }
  }
  // If there is an icon matching the preferred size, we return the result,
  // if there isn't, we will return the maximum available size.
  if (preferredSize === Number.MAX_VALUE) {
    preferredSize = max;
  }

  var url = icons[preferredSize];

  if (url) {
    return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
  } else {
    return 'style/images/default.png';
  }
}
