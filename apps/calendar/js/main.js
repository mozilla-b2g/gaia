(function() {
'use strict';

function waitForLoad() {
  return new Promise(accept => {
    if (document.readyState === 'complete') {
      return accept();
    }

    window.addEventListener('load', function onLoad() {
      window.removeEventListener('load', onLoad);
      return accept();
    });
  });
}

console.log('Will configure rjs...');
require.config({
  baseUrl: '/js',
  waitSeconds: 60,
  paths: {
    shared: '/shared/js'
  },
  shim: {
    'ext/caldav': { exports: 'Caldav' },
    'ext/ical': { exports: 'ICAL' },
    'ext/page': { exports: 'page' },
    'shared/gesture_detector': { exports: 'GestureDetector' },
    'shared/input_parser': { exports: 'InputParser' },
    'shared/lazy_loader': { exports: 'LazyLoader' },
    'shared/notification_helper': { exports: 'NotificationHelper' },
    'shared/performance_testing_helper': { exports: 'PerformanceTestingHelper' }
  }
});

require([
  'app',
  'debug',
  'next_tick'
], (app, debug, nextTick) => {
  debug = debug('main');

  debug('Will wait for window load...');
  waitForLoad().then(() => {
    debug('Window loaded!');

    // Restart the calendar when the timezone changes.
    // We do this on a timer because this event may fire
    // many times. Refreshing the url of the calendar frequently
    // can result in crashes so we attempt to do this only after
    // the user has completed their selection.
    debug('Will listen for timezone change...');
    window.addEventListener('moztimechange', () => {
      debug('Noticed timezone change!');
      nextTick(() => app.forceRestart(), app._mozTimeRefreshTimeout);
    });

    app.init();
  });
});

}());
