!function() {
  function sendChromeEvent(detail) {
      var customEvt = document.createEvent('CustomEvent');
      customEvt.initCustomEvent('mozChromeEvent', true, true, detail);
      window.dispatchEvent(customEvt);
  }

  var nid = 0;
  var listeners = {};

  window.addEventListener('mozContentEvent', function(ev) {
    var px;

    if (ev.detail.type === 'desktop-notification-click') {
      px = listeners[ev.detail.id];
      px.onclick && px.onclick();
    }
    else if (ev.detail.type === 'desktop-notification-close') {
      px = listeners[ev.detail.id];
      px.onclose && px.onclose();
    }
  });

  function Notification() {
    this.createNotification = function(title, body, icon) {
      var px = {};
      px.show = function() {
        var id = ++nid;
        sendChromeEvent({
          type: 'desktop-notification',
          id: id,
          title: title,
          text: body,
          manifestURL: 'http://sytem.gaiamobile.org:8080/manifest.webapp'
        });

        listeners[id] = px;
      };
      return px;
    };
  }

  FFOS_RUNTIME.makeNavigatorShim('mozNotification', new Notification());
}();
