/* global GaiaGrid */
'use strict';

var apps = [
{
  'manifestURL': 'app://gallery.gaiamobile.org/manifest.webapp'
},{
  'manifestURL': 'app://clock.gaiamobile.org/manifest.webapp'
},{
  'manifestURL': 'app://keyboard.gaiamobile.org/manifest.webapp'
},{
  'manifestURL': 'app://camera.gaiamobile.org/manifest.webapp'
},{
  'manifestURL': 'app://music.gaiamobile.org/manifest.webapp'
},{
  'manifestURL': 'app://browser.gaiamobile.org/manifest.webapp'
},{
  'manifestURL': 'app://email.gaiamobile.org/manifest.webapp'
},{
  'entryPoint': 'contacts',
  'manifestURL': 'app://communications.gaiamobile.org/manifest.webapp'
},{
  'entryPoint': 'dialer',
  'manifestURL': 'app://communications.gaiamobile.org/manifest.webapp'
}
];

function MockApplicationSource() {
  this.entries = [];
  var mozApp;
  for (var i = 0, iLen = apps.length; i < iLen; i++){
    if (apps[i].entryPoint) {
      mozApp = new GaiaGrid.Mozapp(apps[i], apps[i].entryPoint);
    } else {
      mozApp = new GaiaGrid.Mozapp(apps[i]);
    }
    mozApp.detail.index = i;
    this.entries.push(mozApp);
  }
}

MockApplicationSource.prototype = {
  addPreviouslyInstalledSvApp: function(manifestURL) {
  },
  mapToApp: function (item) {
  },
  populate: function (next){
    next(this.entries);
  }
};
