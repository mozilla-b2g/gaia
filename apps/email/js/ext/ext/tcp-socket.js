'use strict';
/**
 * Proxies navigator.mozTCPSocket from the worker thread to the main
 * thread, as TCPSocket is not available on workers yet. This API is
 * largely compatible with the real mozTCPSocket implementation,
 * except for bufferedAmount and other buffering semantics (because we
 * can't synchronously retrieve those values).
 *
 * See worker-support/net-main.js for the main-thread counterpart.
 *
 * NOTE: There is also a whiteout-io/tcp-socket repo, which provides a
 * compatibility shim for TCPSocket on non-browser runtimes. This
 * module performs the same type of wrapping (i.e. exporting TCPSocket
 * directly) so that we don't have to modify browserbox/smtpclient to
 * expect a different socket wrapper module.
 *
 * ## Sending lots of data: flow control, Blobs ##
 *
 * mozTCPSocket provides a flow-control mechanism (the return value to
 * send indicates whether we've crossed a buffering boundary and
 * 'ondrain' tells us when all buffered data has been sent), but does
 * not yet support enqueueing Blobs for processing (which is part of
 * the proposed standard at
 * http://www.w3.org/2012/sysapps/raw-sockets/). Also, the raw-sockets
 * spec calls for generating the 'drain' event once our buffered
 * amount goes back under the internal buffer target rather than
 * waiting for it to hit zero like mozTCPSocket.
 *
 * Our main desire right now for flow-control is to avoid using a lot
 * of memory and getting killed by the OOM-killer. As such, flow
 * control is not important to us if we're just sending something that
 * we're already keeping in memory. The things that will kill us are
 * giant things like attachments (or message bodies we are
 * quoting/repeating, potentially) that we are keeping as Blobs.
 *
 * As such, rather than echoing the flow-control mechanisms over to
 * this worker context, we just allow ourselves to write() a Blob and
 * have the net-main.js side take care of streaming the Blobs over the
 * network.
 *
 * Note that successfully sending a lot of data may entail holding a
 * wake-lock to avoid having the network device we are using turned
 * off in the middle of our sending. The network-connection
 * abstraction is not currently directly involved with the wake-lock
 * management, but I could see it needing to beef up its error
 * inference in terms of timeouts/detecting disconnections so we can
 * avoid grabbing a wi-fi wake-lock, having our connection quietly
 * die, and then we keep holding the wi-fi wake-lock for much longer
 * than we should.
 */
define(function(require, exports, module) {

  var router = require('worker-router');
  var routerMaker = router.registerInstanceType('netsocket');

  function TCPSocketProxy(host, port, options) {
    options = options || {};
    options.binaryType = 'arraybuffer';

    // Supported TCPSocket attributes:
    this.host = host;
    this.port = port;
    this.ssl = !!options.useSecureTransport;
    this.binaryType = options.binaryType;
    this.bufferedAmount = 0; // This is fake.
    this.readyState = 'connecting';

    // Event handlers:
    var routerInfo = routerMaker.register(function(data) {
      var eventHandlerName = data.cmd;
      var internalHandler = this['_' + eventHandlerName];
      var externalHandler = this[eventHandlerName];
      // Allow this class to update internal state first:
      internalHandler && internalHandler.call(this, data.args);
      // Then, emulate the real TCP socket events (vaguely):
      externalHandler && externalHandler.call(this, { data: data.args });
    }.bind(this));

    this._sendMessage = routerInfo.sendMessage;
    this._unregisterWithRouter = routerInfo.unregister;

    this._sendMessage('open', [host, port, options]);
  }

  TCPSocketProxy.prototype = {
    _onopen: function() {
      this.readyState = 'open';
    },

    _onclose: function() {
      this._unregisterWithRouter();
      this.readyState = 'closed';
    },

    upgradeToSecure: function() {
      this._sendMessage('upgradeToSecure', []);
    },

    suspend: function() {
      throw new Error('tcp-socket.js does not support suspend().');
    },

    resume: function() {
      throw new Error('tcp-socket.js does not support resume().');
    },

    close: function() {
      if (this.readyState !== 'closed') {
        this._sendMessage('close');
      }
    },

    // We do not use transferrables by default; historically we
    // wrapped a NodeJS-style API whose semantics did not take
    // ownership. However, there is an optimization we want to perform
    // related to Uint8Array.subarray().
    //
    // All the subarray does is create a view on the underlying
    // buffer. This is important and notable because the structured
    // clone implementation for typed arrays and array buffers is
    // *not* clever; it just serializes the entire underlying buffer
    // and the typed array as a view on that. (This does have the
    // upside that you can transfer a whole bunch of typed arrays and
    // only one copy of the buffer.) The good news is that
    // ArrayBuffer.slice() does create an entirely new copy of the
    // buffer, so that works with our semantics and we can use that to
    // transfer only what needs to be transferred.
    send: function(u8array) {
      if (u8array instanceof Blob) {
        // We always send blobs in their entirety; you should slice the blob and
        // give us that if that's what you want.
        this._sendMessage('write', [u8array]);
      }
      else if (u8array instanceof ArrayBuffer) {
        this._sendMessage('write', [u8array, 0, u8array.byteLength]);
      }
      // Slice the underlying buffer and transfer it if the array is a subarray
      else if (u8array.byteOffset !== 0 ||
          u8array.length !== u8array.buffer.byteLength) {
        var buf = u8array.buffer.slice(u8array.byteOffset,
                                       u8array.byteOffset + u8array.length);
        this._sendMessage('write',
                          [buf, 0, buf.byteLength],
                          [buf]);
      }
      else {
        this._sendMessage('write',
                          [u8array.buffer, u8array.byteOffset, u8array.length]);
      }

      return true;
    }
  };


  return {
    open: function(host, port, options) {
      return new TCPSocketProxy(host, port, options);
    }
  };
});
