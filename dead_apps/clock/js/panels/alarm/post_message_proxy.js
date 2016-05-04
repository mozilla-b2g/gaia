'use strict';
define(function(require) {
  var objectMap = {}; // Map of object handlers.
  var responseMap = {}; // Map of callbacks awaiting function results.
  var sequenceNumber = 0; // ID for matching requests to responses.

  var PostMessageProxy = {

    /**
     * Create a PostMessageProxy. This returns an object that you can
     * call like any other JavaScript object, by proxying methods
     * through to another window.
     *
     * When you call a method, rather than returning its return value,
     * it reutrns a Promise that you can resolve to get the return
     * value from the remote function.
     *
     * @param whichWindow The window (usually window.parent or a child)
     * @param objectId A string to identify the object you're proxying
     */
    create: function(whichWindow, objectId) {
      return new Proxy({ window: whichWindow }, {
        get: function(target, name) {
          if (name in target) {
            return target[name];
          }
          return function() {
            var args = Array.slice(arguments);
            return new Promise((resolve, reject) => {
              var responseId = ++sequenceNumber;
              responseMap[responseId] = {
                resolve: resolve,
                reject: reject
              };
              target.window.postMessage({
                postMessageProxy: objectId,
                responseId: responseId,
                fn: name,
                args: args
              }, '*');
            });
          };
        }
      });
    },

    /**
     * On the other window, call PostMessateProxy.receive() to hook up
     * an object that processes messages from a proxy in another window.
     */
    receive: function(objectId, obj) {
      objectMap[objectId] = obj;
    },

    /**
     * Handle 'message' events from postMessage, both when receiving a
     * message to invoke a function call, and receiving a message with
     * the return value of that function call. Both callbacks are
     * handled here so that we only bind one listener for each
     * relevant window.
     */
    _messageHandler: function(evt) {
      var data = evt.data;
      if (data.postMessageProxy) {
        // Remote side (calling a function):
        var obj = objectMap[data.postMessageProxy];
        var { fn, args, responseId } = data;
        try {
          evt.source.postMessage({
            postMessageProxyResult: responseId,
            result: obj[fn].apply(obj, args)
          }, window.location.origin);
        } catch(e) {
          evt.source.postMessage({
            postMessageProxyResult: responseId,
            exception: e.toString(),
            stack: e.stack
          }, evt.origin);
        }
      } else if (data.postMessageProxyResult) {
        // Local side (return value):
        if (responseMap[data.postMessageProxyResult]) {
          var { resolve, reject } = responseMap[data.postMessageProxyResult];
          delete responseMap[data.postMessageProxyResult];
          if (data.exception) {
            var e = new Error();
            e.name = data.exception;
            e.stack = data.stack;
            reject(e);
          } else {
            resolve(data.result);
          }
        }
      }
    }
  };

  window.addEventListener('message', PostMessageProxy._messageHandler);

  return PostMessageProxy;

});
