'use strict';

(function(window) {
  var PERF_EVENT_NAME = 'x-moz-perf';
  var PERF_FLAG_NAME = 'mozPerfHasListener';
  var perfMeasurements;
  var hasRegistered;

  var DEBUG = false;

  function debug() {
    if (DEBUG) {
      var msg = Array.slice(arguments).join(' ');
      console.log(
        'PerformanceHelperAtom: ' + msg + ' (' + Date.now() / 1000 + ')'
      );
    }
  }

  // FIXME: we have to find why this gets imported several times for one test
  if ('PerformanceHelperAtom' in window) {
    debug('FIXME We got called twice');
    return;
  }

  var finalEventName;
  var finishCallback;

  function handlePerfEvent(e) {
    var evtName = e.detail.name;

    debug('got', evtName);

    perfMeasurements[evtName] = window.performance.now();
    checkFinish();
  }

  function checkFinish(name, cb) {
    if (name) {
      finalEventName = name;
    }
    if (cb) {
      finishCallback = cb;
    }

    debug('waiting for ', finalEventName);

    if (finishCallback && finalEventName &&
        finalEventName in perfMeasurements) {
      finishCallback();
      finishCallback = null;
    }
  }

  window.PerformanceHelperAtom = {
    getMeasurements: function() {
      return perfMeasurements;
    },

    init: function() {
      if (hasRegistered) {
        return;
      }

      debug('registering');
      perfMeasurements = Object.create(null);
      perfMeasurements.start = window.performance.now();

      window.addEventListener(PERF_EVENT_NAME, handlePerfEvent);
      window[PERF_FLAG_NAME] = hasRegistered = true;

      debug('end registering');
    },

    unregister: function() {
      // note: we're not reseting mozPerfHasListener to false here because at
      // this point we basically don't mind if the app keeps sending perf
      // events.
      window.removeEventListener(PERF_EVENT_NAME, handlePerfEvent);
      hasRegistered = false;

      marionetteScriptFinished();
    },

    waitForEvent: function(name, cb) {
      checkFinish(name, cb);
    }
  };

  window.PerformanceHelperAtom.init();
})(window.wrappedJSObject);

