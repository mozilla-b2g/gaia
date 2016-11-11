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
            reply.result = json.result;
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
      case 'dir':
      case 'trace':
        let processedArguments = [];
        for (let arg in json.arguments)
          processedArguments.push(json.arguments[arg]);

        console[json.type].apply(null, processedArguments);
        break;
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

    while (msg.state == 'waiting' && !this.zombie)
      currentThread.processNextEvent(true);

    replies.splice(index, 1);
    return msg.result;
  },

  _server: null,
  init: function rc_init() {
    try {
      // Start the WebSocketServer
      let server = this._server = new WebSocketServer();
      server.addListener(this.interpret.bind(this));
      server.start();

      this.zombie = false;
      window.addEventListener('unload', (function() {
        this.zombie = true;
      }).bind(this)); 

      // Configure the hooks to the HUDService
      let waitForMessageReply = this.waitForMessageReply.bind(this);
      let generateMessageId = this.generateMessageId.bind(this);
      new HUDHooks({
        'jsterm': {
          'propertyProvider': function autocomplete(scope, inputValue) {
            let id = generateMessageId();
            let json = {
              'id': id,
              'type': 'autocomplete',
              'data': inputValue
            };

            server.send(JSON.stringify(json));
            let result = waitForMessageReply(id);

            let data = result.data.split(',');
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
            let result = waitForMessageReply(id);
            switch (result.type) {
              case 'error':
              case 'syntaxerror':
              case 'evalerror':
              case 'rangeerror':
              case 'referenceerror':
              case 'typeerror':
              case 'urierror':
                return new Error(result.data);
              case 'function':
              case 'object':
                let obj = {
                  toSource: function() {
                    return result.data;
                  }
                }

                // XXX this is another hack to prevent the object to be
                // inspectable if there is nothing to inspect...
                if (!result.enumerable) {
                  obj.__iterator__ = function() {};
                }
                return Object.create(obj);
              case 'boolean':
                return new Boolean(result.data);
              case 'date':
                return new Date(result.data);
              case 'number':
                return new Number(result.data);
              case 'regexp':
                return new RegExp(result.data);
              case 'null':
                return null;
              case 'undefined':
                return undefined;
              case 'string':
                return result.data;
                break;
              default:
                return result.data;
            }
          },
          'openPropertyPanel': function(evalStr, outputObj, anchor) {
            let propPanel;
            let buttons = [];
         
            let self = this;
            if (evalStr !== null) {
              let button = {
                label: HUDService.getStr("update.button"),
                accesskey: HUDService.getStr("update.accesskey"),
                oncommand: function () {
                  try {
                    let result = self.evalInSandbox(evalStr);
                    if (result !== undefined)
                      propPanel.treeView.data = result;
                  }
                  catch (ex) {
                    self.console.error(ex);
                  }
                }
              };
              buttons.push(button);
            }

            let doc = this.parentNode.ownerDocument;
            let parent = doc.getElementById("mainPopupSet");
            let title = !evalStr ? HUDService.getStr("jsPropertyTitle")
                                 : HUDService.getFormatStr(
                                     "jsPropertyInspectTitle",
                                     [evalStr]);
         
            propPanel = new PropertyPanel(parent, doc, title, outputObj, buttons);
            propPanel.linkNode = anchor;

            // XXX
            propPanel.treeView.getChildItems = function(aItem, aRootElement) {
              let newPairLevel;
          
              if (!aRootElement) {
                newPairLevel = aItem.level + 1;
                aItem = aItem.value;
              }
              else {
                newPairLevel = 0;
              }
          
              let input = (typeof aItem == 'string') ? aItem : evalStr;
              let id = generateMessageId();
              let json = {
                'id': id,
                'type': 'inspect',
                'data': input
              };

              server.send(JSON.stringify(json));
              let result = waitForMessageReply(id);
              let json = JSON.parse(result.data);
          
              let pairs = [];
              for (var prop in json) {
                let pair = {};
                pair.name = prop;
                pair.display = json[prop].display;
                pair.type = json[prop].type;
                pair.value = json[prop].value;

                pair.level = newPairLevel;
                pair.isOpened = false;
                pair.children = pair.type == 0 || //TYPE_OBJECT
                                pair.type == 1 || // TYPE_FUNCTION
                                pair.type == 2; // TYPE_ARRAY
                pairs.push(pair)
              }
          
              return pairs;
            };
            propPanel.treeView.data = outputObj;
         
            let panel = propPanel.panel;
            panel.openPopup(anchor, "after_pointer", 0, 0, false, false);
            panel.sizeTo(350, 450);
            return propPanel;
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

