/* global
   MockNavigatorSettings
 */
'use strict';

(function(exports) {

var container;
var initial = {};

function injectTo(fwindow) {
  fwindow.navigator.mozSettings = MockNavigatorSettings;
}

function render(line) {
  if (line) {
    container = line;
  }

  if (!container) {
    return;
  }

  container.textContent = JSON.stringify(
    MockNavigatorSettings.mSettings, null, ' '
  );
}

function teardown() {
  MockNavigatorSettings.mTeardown();
  MockNavigatorSettings.mSet(initial);
  render();
}

function set(obj) {
  MockNavigatorSettings.mSet(obj);

  for (var p in obj) {
    initial[p] = obj[p];
  }

  render();
}

exports.Shims.contribute(
  'mozSettings',
  {
    injectTo: injectTo,
    render: render,
    teardown: teardown,
    set: set
  }
);

})(window);
