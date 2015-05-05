(() => {
'use strict';

/**
 * Module dependencies
 */
var perf = window.performance;

var initialized = false;
var count = 0;
var worker;

function render() {
  var element = document.getElementsByClassName('count')[0];
  element.innerHTML = count;
}

function main() {
  // Since our entire UI is in index.html, we can emit Chrome Visible.
  perf.mark('navigationLoaded');

  console.log('Binding event handlers...');
  var plus = document.getElementsByClassName('plus')[0];
  plus.addEventListener('click', event => {
    if (!initialized) {
      return;
    }

    count += 1;
    render();
    worker.postMessage({ method: 'setCount', params: [count] });
  });

  var minus = document.getElementsByClassName('minus')[0];
  minus.addEventListener('click', event => {
    if (!initialized) {
      return;
    }

    count -= 1;
    render();
    worker.postMessage({ method: 'setCount', params: [count] });
  });

  render();

  // Now that people can tick the counter up and down,
  // we can mark the Chrome Interactive.
  perf.mark('chromeInteractive');

  // Start our worker and ask for the current counter count.
  console.log('Staring worker...');
  worker = new Worker('/js/worker.js');
  worker.postMessage({ method: 'getCount' });
  worker.onmessage = event => {
    // We got the current counter value from the worker.
    count = event.data;
    initialized = true;
    render();
    // Now the app is 100% ready to go.
    perf.mark('visuallyLoaded');
    perf.mark('contentInteractive');
    perf.mark('fullyLoaded');
  };
}

main();

})();
