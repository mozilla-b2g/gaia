'use strict';

const Cu = Components.utils;

(function(exports) {
  if ('MozReflowAtom' in exports) {
    return;
  }

  let DebuggerCli = Cu.import('resource://gre/modules/devtools/dbg-client.jsm',
                              {}).DebuggerClient;

  let reflowWatcher = {
    count: null,

    _client: null,
    _webappsActor: null,
    _appActor: null,

    init: function rw_init() {
      if (!DebuggerServer.initialized) {
        RemoteDebugger.start();
      }

      this._client = new DebuggerCli(DebuggerServer.connectPipe());

      this._client.connect((type, traits) => {
        this._client.listTabs((res) => {
          this._webappsActor = res.webappsActor;
        });
      });

      this.reflowListener = this.reflowListener.bind(this);
      this._client.addListener('reflowActivity', this.reflowListener);
    },

    trackApp: function rw_trackApp(manifestURL, done) {
      if (!this._webappsActor) {
        return done && done();
      };

      this._client.request({
        to: this._webappsActor,
        type: 'getAppActor',
        manifestURL: manifestURL
      }, (res) => {
        if (res.error) {
          return done && done();
        }

        this._appActor = res.actor;

        this._client.request({
          to: this._appActor.consoleActor,
          type: 'startListeners',
          listeners: ['ReflowActivity']
        }, (res) => {
          this.count = 0;
          done && done();
        });
      });
    },

    untrackApp: function rw_untrackApp(done) {
      if (!this._appActor) {
        return done && done();
      };

      this._client.request({
        to: this._appActor.consoleActor,
        type: 'stopListeners',
        listeners: ['ReflowActivity']
      }, (res) => {
        this.count = 0;
        done && done();
      });
    },

    reflowListener: function rw_reflowListener(type, packet) {
      if (packet.type !== 'reflowActivity') {
        return;
      }
      this.count++;
    }
  };

  reflowWatcher.init();

  exports.MozReflowAtom = {
    startTracking: function(manifestURL, done) {
      reflowWatcher.trackApp(manifestURL, done);
    },

    stopTracking: function(done) {
      reflowWatcher.untrackApp(done);
    },

    getCount: function() {
      return reflowWatcher.count;
    }
  };
})(window);
