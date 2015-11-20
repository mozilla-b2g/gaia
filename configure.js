/* global module, require */
'use strict';
var denodeify = require('promise').denodeify;
var copy = denodeify(require('fs-extra').copy);
var mkdirp = denodeify(require('mkdirp'));

module.exports = [
  {
    inputs: [
      'apps/calendar/application.zip',
      'apps/calendar/manifest.webapp'
    ],
    outputs: [
      'profile/webapps/calendar.gaiamobile.org/application.zip',
      'profile/webapps/calendar.gaiamobile.org/manifest.webapp'
    ],
    rule: function() {
      return mkdirp('profile/webapps/calendar.gaiamobile.org').then(function() {
        return Promise.all([
          'application.zip',
          'manifest.webapp'
        ].map(function(filename) {
          return copy(
            'apps/calendar/' + filename,
            'profile/webapps/calendar.gaiamobile.org/' + filename
          );
        }));
      });
    }
  }
];
