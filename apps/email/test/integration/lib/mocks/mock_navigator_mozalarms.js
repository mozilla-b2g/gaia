Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location)
    return;

  var window = document.defaultView.wrappedJSObject;
  var fakeAlarms = [];

  function makeSafeObject(obj) {
    var exposedProps = {};
    Object.keys(obj).forEach(function(key) {
      exposedProps[key] = 'wr';
    });
    obj.__exposedProps__ = exposedProps;
    return obj;
  }

  function makeFakeRequest(result) {
    var request = makeSafeObject({
      onsuccess: null,
      onerror: null
    });

    window.setTimeout(function() {
      if (request.onsuccess) {
        request.onsuccess(result);
      }
    });

    return request;
  }

  window.navigator.__defineGetter__('mozAlarms', function() {
    return {
      __exposedProps__: {
        remove: 'r',
        add: 'r',
        getAll: 'r'
      },

      remove: function() {
        // just ignore
      },

      add: function(date, respectTimezone, data) {
        fakeAlarms.push(makeSafeObject(data));
        return makeFakeRequest({});
      },

      getAll: function() {
        return makeFakeRequest(makeSafeObject({
          target: makeSafeObject({
            result: []
          })
        }));
      }
    };
  });


  window.navigator.__defineGetter__('__mozFakeAlarms', function() {
    return fakeAlarms;
  });

}, 'document-element-inserted', false);
