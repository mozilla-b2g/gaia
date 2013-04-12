'use strict';
Cu.import('resource://gre/modules/Webapps.jsm');
var permissionTable = {};
Cu.import('resource://gre/modules/PermissionsTable.jsm', permissionTable);

var reg = DOMApplicationRegistry;

reg.loadCurrentRegistry(function() {
  for (let i in reg.webapps) {
    var app = reg.webapps[i];
    reg.getManifestFor(app.origin, gotManifest(i));
  }
});

function gotManifest(appId) {
  return function(manifest) {
    if (!manifest.permissions)
      return;

    let newPermNames = [];
    for (let permName in manifest.permissions) {
      let expandedPermNames = permissionTable.expandPermissions(
        permName,
        manifest.permissions[permName].access
      );

      newPermNames = newPermNames.concat(expandedPermNames);
    }

    var host = 'http://' + appId + ':8080';
    var uri = Services.io.newURI(host, null, null);
    newPermNames.forEach(function(eachPerm) {
      Services.perms.add(uri, eachPerm, 1);
    });
  }
}
