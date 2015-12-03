/* global module, __dirname */

(function(module) {
  'use strict';

  var createServer = require('./server-parent.js');
  var fs = require('fs');
  var Path = require('path');
  var Url = require('url');

  var LateCustomization = function(client, ftu) {
    this.client = client;
    this.ftu = ftu;
    this.server = {};
  };

  LateCustomization.Settings = {
    operatorInfo: {
      'carrier': 'telenor', 'operator': 'telenor', 'region': 'ca',
      'mcc': '238', 'mnc': '02'
    }
  };
  LateCustomization.Selectors = {
    element: '#late_customization',
    appList: '#late_customization-applist',
    appItems: '#late_customization-applist > li'
  };

  LateCustomization.prototype = {
    hash: '#late_customization',
    get displayed() {
      return this.client.findElement(
        LateCustomization.Selectors.element
      ).displayed();
    },
    get appList() {
      return this.client.findElement(
        LateCustomization.Selectors.appList
      );
    },
    get appItems() {
      return this.client.findElements(
        LateCustomization.Selectors.appItems
      );
    },

    manifestResponseFilename: '',

    startServers: function(appNames, callback) {
      appNames.push('api');
      var startedPromises = appNames.map((appName) => {
        return this.startServer(appName);
      });
      Promise.all(startedPromises).then((servers) => {
        servers.forEach((server) => {
          this.setupServerRoutes(server.appName, server);
        });
        callback(null, servers);
      }).catch((ex) => {
        callback(ex);
      });
    },

    startServer: function(name) {
      var rootDir = Path.join(__dirname, '..', '/fixtures/' + name);
      return new Promise((resolve, reject) => {
        createServer(rootDir, this.client, (err, server) => {
          if (err) {
            console.log('createServer err:' + err);
            return reject(err);
          }
          server.appName = name;
          // we'll map requests for http://{name}.host/ to this server
          this.server[name] = server;
          resolve(server);
        });
      });
    },

    stopServers: function(callback) {
      var stopped = [];
      for (var name in this.server) {
        stopped.push(this._stopServer(this.server[name]));
      }
      Promise.all(stopped).then(() => {
        callback();
      }).catch((ex) => {
        callback(ex);
      });
    },

    _stopServer: function(server) {
      return new Promise((resolve, reject) => {
        server.close((err, ok) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    },

    setupServerRoutes: function(name, server) {
      console.log('setupServerRoutes for: ' + name);
      if (name === 'api') {
        this._setupAPIServerRoutes(server);
      }
    },

    _setupAPIServerRoutes: function(server) {
      // configure server for late customization manifest request
      var responsePathname = server.root +'/'+ this.manifestResponseFilename;
      var filestr = fs.readFileSync(responsePathname).toString();
      // we don't know our mock server's hostname until the server is created
      // so preprocess all response strings, replacing faux 'name.host'
      // hostnames with the actual localhost origins
      var appHostRe = /(http|https):\/\/([a-z_\-]+)\.host/g;
      var responseStr = filestr.replace(appHostRe, (m, proto, name) => {
        if (name in this.server) {
          return this.server[name].url;
        } else {
          console.log('_setupAPIServerRoutes, no name/host: ', name, m);
          console.log('_setupAPIServerRoutes, server names: ',
                      Object.keys(this.server));
          return m;
        }
      });
      console.log('prepared canned response to: '+responsePathname,
                  responseStr);
      server.setResponse(
        '/' + this.manifestResponseFilename,
        200, null, responseStr
      );
    },

    translateAliasedUrl: function(_url) {
      var url = Url.parse(_url);
      if (url.hostname === 'localhost') {
        return _url;
      }
      var name = url.hostname.replace('.host', '');
      var server = this.server[name];
      if (server) {
        var serverUrl = Url.parse(server.url);
        url.host = serverUrl.host;
        url.protocol = serverUrl.protocol;
        return Url.format(url);
      } else {
        console.log('translateAliasedUrl, no match for: ', _url);
        return _url;
      }
    },

    getServerForUrl: function(_url) {
      var url = Url.parse(_url);
      var server;
      if (url.hostname !== 'localhost') {
        url = this.translateAliasedUrl(Url.parse(_url));
      }
      for(var name in this.server) {
        if (this.server[name].url === 'http://' + url.host) {
          server = this.server[name];
          break;
        }
      }
      return server;
    },

    waitForServerRequest: function(_url, options) {
      var url = Url.parse(this.translateAliasedUrl(_url));
      var server = this.getServerForUrl(Url.format(url));
      if (!server) {
        throw new Error('waitForServerRequest, nothing serving url: ' + _url);
      }
      this.client.waitFor(() => {
        var metaUrl = '/meta/request_count?url=' +
                      encodeURIComponent(url.pathname);
        var response = server && JSON.parse(server.get(metaUrl));
        return response && response.count;
      }, options);
    },

    isInstalled: function(_manifestUrl) {
      var manifestURL = this.translateAliasedUrl(_manifestUrl);
      this.client.switchToFrame();

      var result = this.client.executeAsyncScript(function(url) {
        var mozApps = window.wrappedJSObject.navigator.mozApps;
        var request = mozApps.mgmt.getAll();
        request.onsuccess = function(evt) {
          var app = evt.target.result.find(app => app.manifestURL === url);
          marionetteScriptFinished(!!app);
        };
        request.onerror = function(evt) {
          marionetteScriptFinished(false);
        };
      }, [manifestURL]);
      this.client.apps.switchToApp(this.ftu.URL);
      console.log('isInstalled result for url: ', manifestURL, result);
      return result;
    }

  };

  module.exports = LateCustomization;
})(module);
