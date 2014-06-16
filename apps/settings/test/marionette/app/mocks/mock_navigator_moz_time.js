Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {

  if (!document || !document.location)
    return;

  var time = '2014-02-02';
  var window = document.defaultView.wrappedJSObject;
  window.navigator.__defineGetter__('mozTime', function() {
    return {
      __exposedProps__: {
        set: 'r'
      },
      set: function(t) {
        time = t;
        return time;
      }
    };
  });

  window.navigator.__defineGetter__('__mozFakeTime', function() {
    return JSON.stringify(time);
  });
}, 'document-element-inserted', false);
