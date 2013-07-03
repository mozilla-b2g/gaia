Calendar.ns('Controllers').ActivityHandler = (function() {

  var debug = Calendar.debug('activity handler');

  function ActivityHandler(app) {
    this.app = app;
    this.accounts = app.store('Account');
    Calendar.Responder.call(this);
  }

  ActivityHandler.prototype = {
    __proto__: Calendar.Responder.prototype,

    //Begin observing MozActivities
    observe: function() {
      var self = this;
      navigator.mozSetMessageHandler('activity', function(activityRequest) {
        var option = activityRequest.source;
        //case for a 'view' MozActivity, specifically imports from a url
        if (option.name === 'view') {
          var url = option.data.url;
          navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {
            var application = evt.target.result;

            if (application !== null && application !== undefined) {
              application.launch();
            }
            self.app.provider('Local').importFromUrl({}, url,
              function(err, param) {});
          };
        }
        //case for a 'view' MozActivity, specifically imports from a file
        else if (option.name === 'open')  {
          var file = option.data.blob;
          var reader = new FileReader();
          navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {

            var application = evt.target.result;

            if (application !== null && application !== undefined) {
              application.launch();
            }
            reader.onloadend = function(readfile) {
              var blob = readfile.target.result;
              self.app.provider('Local').importFromICS({}, blob,
                function(err, param) {});
            };
            reader.readAsDataURL(file);
          };
        }
      });
    }
  };
  return ActivityHandler;
}());
