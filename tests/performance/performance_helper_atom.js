Components.utils.import('resource://gre/modules/Services.jsm');

function _registerListener(document) {
  let window = document.defaultView.wrappedJSObject;

  var PERF_EVENT_NAME = 'x-moz-perf';
  var PERF_FLAG_NAME = 'mozPerfHasListener';
  var perfMeasurements;
  var hasRegistered;

  var DEBUG = false;

  function debug() {
    if (DEBUG) {
      var msg = Array.slice(arguments).join(' ');
      dump(
        'PerformanceHelperAtom: ' + msg + ' (' + Date.now() / 1000 + ')'
      );
    }
  }

  // FIXME: we have to find why this gets imported several times for one test
  if ('mozPerfGetMeasurements' in window) {
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

  function init() {
    if (hasRegistered) {
      return;
    }
    debug('registering');
    perfMeasurements = Object.create(null);
    perfMeasurements.start = window.performance.now();
    window.epochEnd = Date.now();

    window.addEventListener(PERF_EVENT_NAME, handlePerfEvent);
    window[PERF_FLAG_NAME] = hasRegistered = true;

    debug('end registering');
  }

  Object.defineProperty(window, 'mozPerfGetMeasurements', {
    writable: false,
    enumerable : true,
    value: function() {
      return perfMeasurements;
    }
  });

  Object.defineProperty(window, 'mozPerfRegisterListener', {
    writable: false,
    enumerable : true,
    value: function() {
      return init;
    }
  });

  Object.defineProperty(window, 'mozPerfUnregisterListener', {
    writable: false,
    enumerable : true,
    value: function() {
      // note: we're not reseting mozPerfHasListener to false here because at
      // this point we basically don't mind if the app keeps sending perf
      // events.
      window.removeEventListener(PERF_EVENT_NAME, handlePerfEvent);
      hasRegistered = false;
    }
  });

  Object.defineProperty(window, 'mozPerfWaitForEvent', {
    writable: false,
    enumerable : true,
    value: function(name, cb) {
      checkFinish(name, cb);
    }
  });

  init();
}

Services.obs.addObserver(function(document) {
  if (!document || !document.location)
    return;

  _registerListener(document);
}, 'document-element-inserted', false);

