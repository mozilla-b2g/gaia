define(function() {

var listeners = {};

function receiveMessage(evt) {
  var data = evt.data;
//dump('\x1b[37mw <= M: recv: '+data.type+' '+data.uid+' '+data.cmd +'\x1b[0m\n');
  var listener = listeners[data.type];
  if (listener)
    listener(data);
}

window.addEventListener('message', receiveMessage);


function unregister(type) {
  delete listeners[type];
}

function registerSimple(type, callback) {
  listeners[type] = callback;

  return function sendSimpleMessage(cmd, args) {
    //dump('\x1b[34mw => M: send: ' + type + ' null ' + cmd + '\x1b[0m\n');
    window.postMessage({ type: type, uid: null, cmd: cmd, args: args });
  };
}

var callbackSenders = {};

/**
 * Register a message type that allows sending messages that may expect a return
 * message that should trigger a callback.  Messages may not be received unless
 * they have an associated callback from a previous sendMessage.
 */
function registerCallbackType(type) {
  if (callbackSenders.hasOwnProperty(type))
    return callbackSenders[type];
  listeners[type] = function receiveCallbackMessage(data) {
    var callback = callbacks[data.uid];
    if (!callback)
      return;
    delete callbacks[data.uid];

    callback.apply(callback, data.args);
  };
  var callbacks = {};
  var uid = 0;

  var sender = function sendCallbackMessage(cmd, args, callback) {
    if (callback) {
      callbacks[uid] = callback;
    }

    //dump('\x1b[34mw => M: send: ' + type + ' ' + uid + ' ' + cmd + '\x1b[0m\n');
    window.postMessage({ type: type, uid: uid++, cmd: cmd, args: args });
  };
  callbackSenders[type] = sender;
  return sender;
}

/**
 * Register a message type that gets associated with a specific set of callbacks
 * keyed by 'cmd' for received messages.
 */
function registerInstanceType(type) {
  var uid = 0;
  var instanceMap = {};
  listeners[type] = function receiveInstanceMessage(data) {
    var instanceListener = instanceMap[data.uid];
    if (!instanceListener)
      return;

    instanceListener(data);
  };

  return {
    register: function(instanceListener) {
      var thisUid = uid++;
      instanceMap[thisUid] = instanceListener;

      return {
        sendMessage: function sendInstanceMessage(cmd, args, transferArgs) {
//dump('\x1b[34mw => M: send: ' + type + ' ' + thisUid + ' ' + cmd + '\x1b[0m\n');
          window.postMessage({ type: type, uid: thisUid,
                               cmd: cmd, args: args },
                             transferArgs);
        },
        unregister: function unregisterInstance() {
          delete instanceMap[thisUid];
        }
      };
    },
  };
}

function shutdown() {
  window.removeEventListener('message', receiveMessage);
  listeners = {};
  callbackSenders = {};
}

return {
  registerSimple: registerSimple,
  registerCallbackType: registerCallbackType,
  registerInstanceType: registerInstanceType,
  unregister: unregister,
  shutdown: shutdown
};

}); // end define
