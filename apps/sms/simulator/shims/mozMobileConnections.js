'use strict';

(function(exports) {

var container;
var onchangeListeners = [];

function MobileConnection(iccId) {
  this.iccId = iccId || 'FAKE-ICCID';
  this.data = {
    state: 'registered'
  };
  this.voice = {
    network: {}
  };
}

MobileConnection.prototype = {
  _getInfo: function() {
    return JSON.stringify(this, null, ' ');
  }
};

var slotInfo = null;
sims(1);

function getMozMobileConnections() {
  return slotInfo;
}

function injectTo(fwindow) {
  Object.defineProperty(fwindow.navigator, 'mozMobileConnections', {
    configurable: true,
    enumerable: true,
    get: getMozMobileConnections
  });
}

function slots(count) {
  if (!slotInfo) {
    slotInfo = [];
  }

  slotInfo.length = count;
  for (var i = 0; i < count; i++) {
    slotInfo[i] = slotInfo[i] || null;
  }

  render();
  triggerOnchange();
}

function sims(count) {
  if (!slotInfo) {
    slotInfo = [];
  }

  for (var i = 0; i < count; i++) {
    slotInfo[i] = new MobileConnection('FAKE-ICCID-' + i);
  }

  render();
  triggerOnchange();
}

function render(line) {
  if (line) {
    container = line;
  }

  if (!container) {
    return;
  }

  container.textContent = '';

  var info = document.createElement('div');
  info.textContent = 'nb slots: ' + slotInfo.length;
  container.appendChild(info);

  slotInfo.forEach(function(slot, i) {
    var slotNode = document.createElement('div');

    var slotInfo = slot ? slot._getInfo() : 'absent';
    slotNode.textContent = 'slot ' + i + ': ' + slotInfo;
    container.appendChild(slotNode);
  });
}

function onchange(func) {
  onchangeListeners.push(func);
}

function triggerOnchange() {
  onchangeListeners.forEach((func) => func());
}

exports.Shims.contribute(
  'mozMobileConnections',
  {
    injectTo: injectTo,
    render: render,
    sims: sims,
    slots: slots,
    current: getMozMobileConnections,
    onchange: onchange
  }
);

})(window);
