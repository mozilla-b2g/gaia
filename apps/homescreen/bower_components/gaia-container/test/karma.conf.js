/* global module */
// Karma configuration
'use strict';

module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],
    client: {
      captureConsole: true,
      mocha: {'ui': 'tdd'}
    },

    basePath: '../',
    files: [
      'script.js',

      'test/test.js'
    ],

    browsers: ['FirefoxLatest'],
    customLaunchers: {
      FirefoxLatest: {
        base: 'FirefoxNightly',
        prefs: {'dom.webcomponents.enabled': true}
      }
    }
  });
};
