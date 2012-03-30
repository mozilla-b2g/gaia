/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports){
  var MockApp = function(data){
    var key;
    for(key in data){
      this[key] = data[key];
    }

  };

  MockApp.prototype = {

    getDetails: function() {
      return {
        origin: this.origin,
        url: this.origin + this.manifest.launch_path,
        type: 'webapps-launch'
      };
    },

    launch: function(){
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozChromeEvent', true, true, this.getDetails());

      window.dispatchEvent(event);
    }
  };

  exports.AppLoader = {

    appManifestFallback: './apps-manifest-fallback.json',

    isDesktop: function(){
      return navigator.userAgent.indexOf('Mobile') === -1;
    },

    _processAllAppsManifest: function(xhr){
      var data = JSON.parse(xhr.responseText),
          app, entry, applications = [];

      for(app in data.webapps){
        entry = data.webapps[app];
        entry.manifest = data.manifests[app];

        applications.push(new MockApp(entry));
      }

      return {
        target: {
          result: applications
        }
      }
    },

    fallback: function(callback){
      var xhr = new XMLHttpRequest(),
          self = this;

      xhr.open('GET', this.appManifestFallback, true);

      xhr.onreadystatechange = function() {
        if(xhr.readyState === 4){
          if(xhr.status === 200 || xhr.status === 0){
            callback(self._processAllAppsManifest(xhr));
          } else {
            //notify user that app fallback failed
          }
        }
      }

      xhr.send(null);
    },

    load: function(callback){
      var handler = navigator.mozApps.mgmt.getAll(),
          self = this;

      handler.onsuccess = function(){
        callback.apply(null, arguments);
      }

      handler.onerror = function(){
        //on the device if loading the apps fail, I would rather
        //have some big obvious error rather then falling back
        //on something designed to full a temp gap in desktop.
        if(self.isDesktop()){
          self.fallback(callback);
        }
      }
    }

  }
}(window));
