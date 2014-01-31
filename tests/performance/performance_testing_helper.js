/* This runs in the chrome context */

Components.utils.import('resource://gre/modules/Services.jsm');

dump('adding observer');

Services.obs.addObserver(function(document) {
  dump('inserting testing helper');
  if (!document || !document.location)
    return;
  dump('inserting testing helper #2');

  var window = document.defaultView.wrappedJSObject;

  function dispatch(name) {
    if (!window.mozPerfHasListener) {
      return;
    }

    var now = window.performance.now();

    setTimeout(function() {
      console.log('PerformanceTestingHelper: dispatching event', name);

      var detail = {
        name: name,
        timestamp: now
      };
      var evt = new CustomEvent('x-moz-perf', { detail: detail });
      window.dispatchEvent(evt);
    });
  }

  window.__defineGetter__('PerformanceTestingHelper', function() {
    return {
      __exposedProps__: {
        dispatch: 'r'
      },

      dispatch: dispatch
    };
  }
}, 'document-element-inserted', false);

