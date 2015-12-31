/**
 * @fileoverview this is where all the global profile overrides live.
 */
'use strict';

// Firefox bans loading urls on certain ports even through localhost,
// but we run the integration web server on a random local port so we need
// to disable this security.
// See http://www-archive.mozilla.org/projects/netlib/PortBanning.html
var mozBannedPorts =
  [1,7,9,11,13,15,17,19,20,21,22,23,25,37,42,43,53,77,79,87,95,101,102,103,
   104,109,110,111,113,115,117,119,123,135,139,143,179,389,465,512,513,514,
   515,526,530,531,532,540,556,563,587,601,636,993,995,2049,4045,6000];

module.exports = {
  settings: {
    'search.suggestions.enabled': false,
    'cdn.url': 'http://localhost',
    'appsearch.url': null,
    'search.marketplace.url': null,
    'ftu.manifestURL': null,
    'lockscreen.enabled': false,
    'screen.timeout': 0,
    'privacy.trackingprotection.shown': true
  },
  prefs: {
    'geo.wifi.uri': 'http://localhost',
    'app.update.enabled': false,
    'app.update.url': '',
    'app.update.url.override': '',
    'browser.newtabpage.directory.source': '',
    'browser.newtabpage.directory.ping': '',
    'webapps.update.enabled': false,
    'network.security.ports.banned.override': mozBannedPorts.join(',')
  }
  // apps: {}
};
