Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location)
    return;

  var window = document.defaultView.wrappedJSObject;

  window.__defineGetter__('MozActivity', function() {
    return function fakeMozActivity(data) {
      document.body.dataset.activity = JSON.stringify(data);
    };
  });

}, 'document-element-inserted', false);
