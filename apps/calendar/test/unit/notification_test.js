requireApp('calendar/shared/js/notification_helper.js');

suiteGroup('Notification', function() {
  var sent = [];
  var MockNotificationHelper = {
    send: function() {
      var args = Array.slice(arguments);
      var callback = args[args.length - 1];

      sent.push(args);

      // wait until next tick... and fire onclick handler.
      setTimeout(callback);
    },

    getIconURI: function() {
      return 'icon';
    }
  };

  var realMozApps;
  var mozApp;
  var realNotificationHelper;

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = {
      getSelf: function() {
        var ctx = {};
        setTimeout(function() {
          if (ctx.onsuccess) {
            ctx.onsuccess({
              target: {
                result: mozApp
              }
            });
          }
        });

        return ctx;
      }
    };

    realNotificationHelper = window.NotificationHelper;
    window.NotificationHelper = MockNotificationHelper;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    window.NotificationHelper = realNotificationHelper;
  });

  var app;
  setup(function() {
    app = testSupport.calendar.app();
    sent.length = 0;
    // will be returned by getSelf
    mozApp = {};
  });

  var title = 'title';
  var description = 'description';
  var url = '/show/id';

  test('#send', function(done) {
    var sentTo;
    var firesReady = false;
    app.router.show = function(url) {
      sentTo = url;
    };

    mozApp.launch = function() {
      done(function() {
        var notification = sent[0];
        assert.ok(firesReady, 'is is freed prior to launching');
        assert.equal(notification[0], title, 'sets title');
        assert.equal(notification[1], description, 'sets description');
        assert.equal(notification[2], 'icon?' + url);
        assert.equal(sentTo, url, 'sends url');
      });
    };

    function onready() {
      firesReady = true;
    }

    Calendar.Notification.send(
      title,
      description,
      url,
      onready
    );
  });

});
