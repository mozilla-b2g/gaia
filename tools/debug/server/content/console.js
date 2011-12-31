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
        let replyId = json.replyTo;
        for (let i = 0; i < this._replies.length; i++) {
          let reply = this._replies[i];
          if (reply.id == replyId) {
            reply.data = json.rv;
            reply.state = 'replied';
            break;
          }
        }
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

  _msgId: 0,
  generateMessageId: function rc_generateMessageId() {
    return this._msgId++;
  },

  _replies: [],
  waitForMessageReply: function rc_waitForMessageReply(id) {
    let msg = {
      'id': id,
      'state': 'waiting',
      'data': null
    };

    let replies = this._replies;
    let index = replies.length;
    replies.push(msg);

    let currentThread = Cc["@mozilla.org/thread-manager;1"]
                          .getService(Ci.nsIThreadManager)
                          .currentThread;

    // XXX add a timeout and ensure the server is alive
    while (msg.state == 'waiting')
      currentThread.processNextEvent(true);

    replies.splice(index, 1);
    return msg.data;
  },

  _server: null,
  init: function rc_init() {
    try {
      // Start the WebSocketServer
      let server = this._server = new WebSocketServer();
      server.addListener(this.interpret.bind(this));
      server.start();

      // Configure the hooks to the HUDService
      let waitForMessageReply = this.waitForMessageReply.bind(this);
      let generateMessageId = this.generateMessageId.bind(this);
      new HUDHooks({
        'jsterm': {
          'propertyProvider': function autocomplete(scope, inputValue) {
            let id = generateMessageId();
            let data = 'JSPropertyProvider(\'' + inputValue + '\')';
            let json = {
              'id': id,
              'data': data
            };

            server.send(JSON.stringify(json));
            let reply = waitForMessageReply(id);

            let data = reply.split(',');
            return {
              'matchProp': data.pop(),
              'matches': data 
            };
          },
          'evalInSandbox': function eval(str) {
            if (str.trim() === 'help' || str.trim() === '?')
              str = 'help()';

            let id = generateMessageId();
            let json = {
              'id': id,
              'data': str
            };

            server.send(JSON.stringify(json));
            return waitForMessageReply(id);
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

