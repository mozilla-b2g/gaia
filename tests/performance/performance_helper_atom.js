Components.utils.import('resource://gre/modules/Services.jsm');

function _registerListener(document) {
  try {
    let window = document.defaultView.wrappedJSObject;

    var PERF_EVENT_NAME = 'x-moz-perf';
    var PERF_FLAG_NAME = 'mozPerfHasListener';
    var perfMeasurements;
    var hasRegistered;

    var DEBUG = true;

    function debug() {
      if (DEBUG) {
        var msg = Array.slice(arguments).join(' ');
        dump(
          'PerformanceHelperAtom: ' + msg + ' (' + Date.now() / 1000 + ')'
        );
      }
    }

    dump('OMFG setting up');
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

    var atom = {
      getMeasurements: function() {
        dump('OMFG getMeasurements');
        return perfMeasurements;
      },

      init: function() {
        if (hasRegistered) {
          return;
        }
        dump('OMFG init');
        debug('registering');
        perfMeasurements = Object.create(null);
        perfMeasurements.start = window.performance.now();

        window.addEventListener(PERF_EVENT_NAME, handlePerfEvent);
        window[PERF_FLAG_NAME] = hasRegistered = true;

        debug('end registering');
      },

      unregister: function() {
        dump('OMFG unregister');
        // note: we're not reseting mozPerfHasListener to false here because at
        // this point we basically don't mind if the app keeps sending perf
        // events.
        window.removeEventListener(PERF_EVENT_NAME, handlePerfEvent);
        hasRegistered = false;

        marionetteScriptFinished();
      },

      waitForEvent: function(name, cb) {
        dump('OMFG waitForEvent');
        checkFinish(name, cb);
      }
    };


    window.__defineGetter__('PerformanceHelperAtom', function() {
      try {
        dump('OMFG returning atom ' + JSON.stringify(Object.keys(atom)));
        for (var i in atom) {
          dump('OMFG its ' + i + ' member is ' + JSON.stringify(atom[i]));
        }
      } catch (e) {
        dump('OMFG ERR4: ' + e.toString() + '\n');
      }
      return atom;
    });

    window.PerformanceHelperAtom.init();
  } catch (e) {
    dump('OMFG ERR2: ' + e.toString() + '\n');
  }
}

dump('OMFG let\'s start');

try {
    dump('OMFG setting up 1');
    Services.obs.addObserver(function(document) {
      if (!document || !document.location)
        return;

      dump('OMFG setting up 2');
      var location = document.location.href;
      dump('OMFG "' + location + '"');

      _registerListener(document);
    }, 'document-element-inserted', false);

} catch (e) {
  dump('OMFG ERR1: ' + e.toString() + '\n');
}

