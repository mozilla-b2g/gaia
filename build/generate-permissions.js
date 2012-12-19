"use strict";

var permissionScope = [];

try {
  Components.utils.import('resource://gre/modules/PermissionsTable.jsm',
                          permissionScope); 
} catch (x) {
  // Still not on the xulrunner...
  Components.utils.import("file://"+ GAIA_DIR + "/build/PermissionsTable.jsm",
                          permissionScope);
}


function debug(msg) {
  dump('-*- generatePermissions.js ' + msg + '\n');
}


function generateSettingsPermissionsTable() {
  var init = getFile(GAIA_DIR, 'shared', 'resources', 'permissionsTable.json');
  var normalPermissions = [];
  var derivablePermissions = [];
  var accessValues = ["read", "write", "create"];
  for(let permName in permissionScope.PermissionsTable) {
    var tableEntry = permissionScope.PermissionsTable[permName];
    var isDerivable = tableEntry["access"] !== undefined;
    var allNames = [];
    allNames.push(permName);
    if (tableEntry.substitute) {
      allNames = allNames.concat(tableEntry.substitute);
    } else if (tableEntry.additional) {
      allNames = allNames.concat(tableEntry.additional);
    }
    if (isDerivable) {
      derivablePermissions = derivablePermissions.concat(allNames);
    } else {
      normalPermissions = normalPermissions.concat(allNames);
    }
  }
  
  var permTable = {
    "plainPermissions": normalPermissions,
    "composedPermissions" : derivablePermissions,
    "accessModes" : accessValues
  };

  writeContent(init, JSON.stringify(permTable));

}

generateSettingsPermissionsTable();
