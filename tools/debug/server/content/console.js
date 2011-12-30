/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

const RemoteConsole = {
  get localConsole() {
    delete this.localConsole;
    let context = HUDService.currentContext();
    let console = context.gBrowser.selectedBrowser.contentWindow.console;
    return this.localConsole = console;
  },

  interpret: function rc_interpret(msg) {
    let json = msg;
    try {
      json = JSON.parse(json);
    } catch(e) {}

    let console = this.localConsole;
    switch (json.type) {
      case 'connect':
        console.info('Connection from ' + json.host);
        break;
      case 'connect':
        // XXX handle disconnect
        break;
      case 'reply':
        this.response = json.rv;
        this.waitForResponse = false;
        break;
      case 'log':
      case 'debug':
      case 'info':
      case 'warn':
      case 'error':
      case 'group':
      case 'groupCollapsed':
      case 'groupEnd':
      case 'time':
      case 'timeEnd':
        let processedArguments = [];
        for (let arg in json.arguments)
          processedArguments.push(json.arguments[arg]);

        console[json.type].apply(null, processedArguments);
        break;
      case 'dir':
      case 'trace':
        Cu.reportError('Unsupported command: ' + json.type);
        break;
      default:
        Cu.reportError('Unknow command: ' + json.type);
        break;
    }
  },

  _server: null,
  init: function rc_init() {
    try {
      // Start the WebSocketServer
      let server = this._server = new WebSocketServer();
      server.addListener(this.interpret.bind(this));
      server.start();

      // Configure the hooks to the HUDService
      let self = this;
      new HUDHooks({
        'jsterm': {
          'propertyProvider': function autocomplete(scope, inputValue) {
            // XXX remote this call
            return {
              matchProp: inputValue,
              matches: []
            };
          },
          'evalInSandbox': function eval(str) {
            if (str.trim() === 'help' || str.trim() === '?')
              str = 'help()';

            server.send(str);
        
            // XXX this should be enhance with a frame id to know when
            // the real reply has arrived instead of randomly use the
            // reply from the remote side.
            let currentThread = Cc["@mozilla.org/thread-manager;1"]
                                  .getService(Ci.nsIThreadManager)
                                  .currentThread;

            self.waitForResponse = true;
            while (self.waitForResponse)
              currentThread.processNextEvent(true);
            return self.response;
          }
        }
      });
    } catch (e) {
      dump(e);
    }
  },

  uninit: function rc_uninit() {
    this._server.stop();
    delete this._server;
  }
};

