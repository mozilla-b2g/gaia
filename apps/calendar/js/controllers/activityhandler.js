Calendar.ns('Controllers').ActivityHandler = (function() {

  var debug = Calendar.debug('activity handler');

  function ActivityHandler(app) {
    Calendar.Responder.call(this);
    this.app = app;
    this.accounts = app.store('Account');
  }

  ActivityHandler.prototype = {
    __proto__: Calendar.Responder.prototype,

    /**
     * Begin observing MozActivities
     */
    observe: function() {
      var self = this;
      navigator.mozSetMessageHandler('activity', function(activityRequest) {
        var option = activityRequest.source;
        switch (option.name) {
          case 'view':
            //case for a 'view' MozActivity, specifically imports from a url
            var url = option.data.url;
            navigator.mozApps.getSelf().onsuccess = function(evt) {
              var application = evt.target.result;

              if (application) {
                application.launch();
              }
              self.app.provider('Local').importCalendar(url,
                function(err, urlCalendarImported) {
                  if (err) {
                    console.log('Failed to import calendar: ' + err);
                  }
                });
            };
            break;
          case 'open':
            //case for a 'view' MozActivity, specifically imports from a file
            var file = option.data.blob;
            navigator.mozApps.getSelf().onsuccess = function(evt) {
              var reader = new FileReader();
              var application = evt.target.result;

              if (application) {
                application.launch();
              }
              reader.onloadend = function(evt) {
                var blob = evt.target.result;
                self.app.provider('Local').importCalendar(blob,
                  function(err, icsFileImported) {
                    if (err) {
                      console.log('Failed to import calendar: ' + err);
                    }
                  });
              };
              reader.readAsDataURL(file);
            };
            break;
        }
      });
    }
  };
  return ActivityHandler;
}());
