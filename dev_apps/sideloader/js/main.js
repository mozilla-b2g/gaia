function displayInstalledApps() {

  function clickHandler(app) {
    return function() {
      exportAppToSDCard(app);
    }
  }

  var appMgr = navigator.mozApps.mgmt;
  appMgr.getAll().onsuccess = function(event) {
    var apps = event.target.result;
    var container = document.querySelector("#exportAppList");
    var fragment = document.createDocumentFragment();
    for (var app of apps) {
      if (app.manifest.type == 'certified')
        continue;

      var entryNode = createAppEntryNode(app);

      entryNode.querySelector('a').onclick = clickHandler(app)

      fragment.appendChild(entryNode);
    }
    container.innerHTML = "";
    container.appendChild(fragment);
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
  getSDCardApps(function(files) {
    var container = document.querySelector("#importAppList");
    var fragment = document.createDocumentFragment();
    files.forEach(function(file) {
      var entryNode = createFileEntryNode(file);
      entryNode.querySelector('a').onclick = function() {
        navigator.mozApps.mgmt.import(file).then(function(nada) {
          // Yay.
          console.log('Imported ', filename, 'from SD card');
        }, function(reason) {
          // TODO: enumerate reasons -> user feedback
          // * already installed
          // * what else?
          console.log('Broken promise importing app', file.name, reason);
        });
      }
      fragment.appendChild(entryNode);
    });
    container.innerHTML = "";
    container.appendChild(fragment);
  });
}

function createFileEntryNode(file) {
  var template = document.querySelector('#appListEntry').
                          content.cloneNode(true);

  var name = file.name.split('/').reverse().shift();
  template.querySelector('.appListEntryName').textContent = name;

  // TODO: add icon
  // TODO: add developer
  // TODO: add description

  return template;
}

function createAppEntryNode(app) {
  var template = document.querySelector('#appListEntry').
                          content.cloneNode(true);

  template.querySelector('.appListEntryName').textContent = app.manifest.name;

  // TODO: add icon
  // TODO: add developer
  // TODO: add description

  return template;
}

document.addEventListener('DOMContentLoaded', function() {
  var appMgr = navigator.mozApps.mgmt;
  appMgr.oninstall = displayInstalledApps;
  appMgr.onuninstall = displayInstalledApps;
  displayInstalledApps();
  displaySDCardApps();
});
