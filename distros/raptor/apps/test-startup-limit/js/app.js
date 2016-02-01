var counter = {};

counter.component = (() => {
'use strict';

var exports = {};

/**
 * Component state
 */
exports.base = 'decimal';
exports.count = 0;
exports.binary = '0';
exports.decimal = '0';

exports.render = function() {
  console.log('Will render ui');
  var toggleElement = document.getElementsByClassName('toggle')[0];
  var decimalElement = document.getElementsByClassName('decimal')[0];
  var binaryElement = document.getElementsByClassName('binary')[0];

  decimalElement.innerHTML = this.decimal;
  binaryElement.innerHTML = this.binary;

  if (this.base === 'decimal') {
    toggleElement.innerHTML = 'Switch to binary';
    binaryElement.style.display = 'none';
    decimalElement.style.display = 'block';
  } else if (this.base === 'binary') {
    toggleElement.innerHTML = 'Switch to decimal';
    decimalElement.style.display = 'none';
    binaryElement.style.display = 'block';
  }
};

return exports;

})();

counter.string = (() => {
'use strict';

var exports = {};

exports.convertToBinary = function(value) {
  // Fake async operation.
  return Promise.resolve().then(() => {
    if (value === 0) {
      return '0';
    }

    var remainders = '';
    for (var quotient = value; quotient > 0; quotient = Math.floor(quotient / 2)) {
      remainders += (quotient % 2);
    }

    return reverse('', remainders);
  });
};

function reverse(str, backwards) {
  if (!backwards.length) {
    return str;
  }

  var chr = backwards[backwards.length - 1];
  return reverse(str + chr, backwards.slice(0, -1));
};

return exports;

})();

counter.app = (() => {
'use strict';

var component = counter.component;
var perf = window.performance;
var string = counter.string;

var initialized = false;
var worker;

var exports = {};

exports.main = function() {
  // Since our entire UI is in index.html, we can emit navigationLoaded.
  perf.mark('navigationLoaded');

  console.log('Binding event handlers');
  var toggle = document.getElementsByClassName('toggle')[0];
  toggle.addEventListener('click', ontoggle);
  var plus = document.getElementsByClassName('plus')[0];
  plus.addEventListener('click', onplus);
  var minus = document.getElementsByClassName('minus')[0];
  minus.addEventListener('click', onminus);

  component.render();

  // Now that people can switch between bases, we can mark navigationInteractive.
  perf.mark('navigationInteractive');

  // Start our worker and ask for the current counter count.
  console.log('Starting worker');
  worker = new Worker('/js/worker.js');
  worker.postMessage({ method: 'getCount' });
  worker.onmessage = event => {
    // We got the current counter value from the worker.
    var count = event.data;
    console.log(`Read count = ${count} from worker`);
    component.count = count;
    component.decimal = count.toString();
    initialized = true;
    component.render();
    perf.mark('visuallyLoaded');
    perf.mark('contentInteractive');

    // Now in the background we're going to update the binary value.
    string.convertToBinary(count).then(binaryCount => {
      component.binary = binaryCount;
      perf.mark('fullyLoaded');
    });
  };
};

function ontoggle() {
  component.base = component.base === 'decimal' ? 'binary' : 'decimal';
  component.render();
}

function add(diff) {
  if (!initialized) {
    return;
  }

  var count = component.count;
  count = Math.max(0, count + diff);
  return string.convertToBinary(count).then(binaryCount => {
    component.count = count;
    component.decimal = count.toString();
    component.binary = binaryCount;
    component.render();
    worker.postMessage({ method: 'setCount', params: [count] });
  });
}

var onplus = add.bind(null, 1);
var onminus = add.bind(null, -1);

return exports;

})();

// main
var app = counter.app;
app.main();
