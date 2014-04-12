/*global MockNavigatorMozIccManager */

'use strict';

(function(exports) {

var container;

function mozMobileConnections() {
  return exports.Shims.get('mozMobileConnections');
}

function injectTo(fwindow) {
  fwindow.navigator.mozIccManager = MockNavigatorMozIccManager;
}

function render(line) {
  if (line) {
    container = line;
  }

  if (!container) {
    return;
  }

  container.textContent = '';

  var sims = MockNavigatorMozIccManager.iccIds;

  var info = document.createElement('div');
  info.textContent = 'nb sims: ' + sims.length;
  container.appendChild(info);

  sims.forEach(function(sim, i) {
    var simNode = document.createElement('div');

    simNode.textContent = 'sim ' + i + ': ' + sim;
    container.appendChild(simNode);
  });
}

function teardown() {
  MockNavigatorMozIccManager.mTeardown();
  var slots = mozMobileConnections().current();
  slots.filter((slot) => slot && slot.iccId)
    .forEach(function(slot) {
      MockNavigatorMozIccManager.addIcc(slot.iccId, { cardState: 'ready' });
    });
}

function refresh() {
  teardown();
  render();
}

mozMobileConnections().onchange(refresh);
refresh();

exports.Shims.contribute(
  'mozIccManager',
  {
    injectTo: injectTo,
    render: render,
    teardown: teardown
  }
);

})(window);
