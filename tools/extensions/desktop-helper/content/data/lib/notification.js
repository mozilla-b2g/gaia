!function() {

  function system() {
    function sendChromeEvent(detail) {
        var customEvt = document.createEvent('CustomEvent');
        customEvt.initCustomEvent('mozChromeEvent', true, true, detail);
        window.dispatchEvent(customEvt);
    }

    // someone interacted with the notification (from the system app)
    window.addEventListener('mozContentEvent', function(ev) {
      var px;

      if (ev.detail.type === 'desktop-notification-click') {
        px = listeners[ev.detail.id];

        px.source.postMessage({
          action: 'notification-click',
          id: px.sourceId
        }, px.origin);
      }
      else if (ev.detail.type === 'desktop-notification-close') {
        px = listeners[ev.detail.id];

        px.source.postMessage({
          action: 'notification-close',
          id: px.sourceId
        }, px.origin);
      }
    });

    var nid = 0;
    var listeners = {};
    window.addEventListener('mozChromeEvent', function(e) {
      var detail = e.detail;
      if (detail.type === 'notification') {

        var id = ++nid;
        // show notification
        sendChromeEvent({
          type: 'desktop-notification',
          id: id,
          title: detail.title,
          text: detail.text,
          manifestURL: detail.manifestURL,
          icon: detail.icon
        });

        listeners[id] = {
          source: e.source,
          sourceId: detail.id,
          origin: detail.origin
        };
      }
    });
  }
  if (/system.gaiamobile.org/.test(location.href)) {
    system();
  }

  // SHIM!
  (function() {
    var nid = 0;
    var listeners = {};
    function Notification() {
      this.createNotification = function(title, body, icon) {
        var px = {};
        px.show = function() {
          var id = ++nid;

          FFOS_RUNTIME.sendFrameEvent({
            type: 'notification',
            id: id,
            title: title,
            text: body,
            manifestURL: 'http://sytem.gaiamobile.org:8080/manifest.webapp',
            origin: window.location + '',
            icon: icon
          });

          listeners[id] = px;
        };
        return px;
      };
    }

    window.addEventListener('message', function(e) {
      var px = (listeners[e.data.id] || []);
      if (e.data.action === 'notification-click') {
        px.onclick && px.onclick();
      }
      else if (e.data.action === 'notification-close') {
        px.onclose && px.onclose();
      }
    });

    FFOS_RUNTIME.makeNavigatorShim('mozNotification', new Notification());
  })();
}();
