define(function(require, exports, module) {
'use strict';

var asyncRequire = require('common/async_require');
var chai = require('ext/chai');
var chaiAsPromised = require('ext/chai-as-promised');
var co = require('ext/co');

module.exports = function testLoader(path) {
  return co(function *() {
    console.log(`Will load test ${path}`);
    l10nLink('/locales/calendar.{locale}.properties');
    l10nLink('/shared/locales/date/date.{locale}.properties');
    l10nMeta('en-US', ['en-US']);
    yield loadL10n();
    var testSupport = yield asyncRequire('test/support/calendar');
    testSupport.core();
    // TODO(gaye): No more window/global stuff...
    window.testSupport = window.testSupport || {};
    window.testSupport.calendar = testSupport;
    chai.use(chaiAsPromised);
    extendChai();
    window.assert = chai.assert;
    window.expect = chai.expect;
    window.should = chai.Should();
    yield asyncRequire(path);
  });
};

function *loadL10n() {
  yield asyncRequire('shared/l10n');
  yield asyncRequire('shared/l10n_date');

  // Massive hack to trick l10n to load
  // TODO: upstream a fix to l10n.js
  document.dispatchEvent(new Event('DOMContentLoaded'));

  var readyState = navigator.mozL10n.readyState;
  switch (readyState) {
    case 'complete':
    case 'interactive':
      return Promise.resolve();
  }

  return new Promise(resolve => window.addEventListener('localized', resolve));
}

function l10nLink(href) {
  var link = document.createElement('link');
  link.setAttribute('href', href);
  link.setAttribute('rel', 'localization');
  document.head.appendChild(link);
}

function l10nMeta(defaultLanguage, availableLanguages) {
  var metaDL = document.createElement('meta');
  metaDL.setAttribute('name', 'defaultLanguage');
  metaDL.setAttribute('content', defaultLanguage);

  var metaAL = document.createElement('meta');
  metaAL.setAttribute('name', 'availableLanguages');
  metaAL.setAttribute('content', availableLanguages.join(', '));

  document.head.appendChild(metaDL);
  document.head.appendChild(metaAL);
}

function extendChai() {
  // XXX: this is a lame way to do this
  // in reality we need to fix the above upstream
  // and leverage new chai 1x methods
  chai.assert.hasProperties = function(given, props, msg) {
    msg = (typeof(msg) === 'undefined') ? '' : msg + ': ';

    if (props instanceof Array) {
      props.forEach(function(prop) {
        assert.ok(
          (prop in given),
          msg + 'given should have "' + prop + '" property'
        );
      });
    } else {
      for (var key in props) {
        assert.deepEqual(
          given[key],
          props[key],
          msg + ' property equality for (' + key + ') '
        );
      }
    }
  };
}

});
