Calendar.ns('Controllers').ActivityHandler = (function() {

  var debug = Calendar.debug('expand events');

  function ActivityHandler(app) {
    this.app = app;
    this.accounts = app.store('Account');
    Calendar.Responder.call(this);
  }

  ActivityHandler.prototype = {
    __proto__: Calendar.Responder.prototype,

    observe: function(nav) {
      var self = this;
      nav.mozSetMessageHandler('activity', function(activityRequest) {
        var option = activityRequest.source;
          if (option.name === "view") {
            var url = option.data.url;
            nav.mozApps.getSelf().onsuccess = function gotSelf(evt) {
              var self = this;
              var application = evt.target.result;
              
              if (application !== null) {
                application.launch();
              }
              self.app.provider('Local').importFromUrl({},url,function(err,param){});
            }.bind(self);
          }
          else if (option.name === "open")  {
            var file = option.data.blob;
            var reader = new FileReader();
            nav.mozApps.getSelf().onsuccess = function gotSelf(evt) {
              var self = this;
              var application = evt.target.result;

              if (application !== null) {
                application.launch();
              }
              reader.onloadend = function(arg) {
                var blob = arg.target.result;
                self.app.provider('Local').importFromICS({},blob,function(err,param){});
              }
              reader.readAsDataURL(file);
              
            }.bind(self);
          }
        });
    }
  };
  return ActivityHandler;


}());
    
