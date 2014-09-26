/**
 * The main-thread counterpart to our node-net.js wrapper.
 *
 * Provides the smarts for streaming the content of blobs.  An alternate
 * implementation would be to provide a decorating proxy to implement this
 * since smart Blob transmission is on the W3C raw-socket hit-list (see
 * http://www.w3.org/2012/sysapps/raw-sockets/), but we're already acting like
 * node.js's net implementation on the other side of the equation and a totally
 * realistic implementation is more work and complexity than our needs require.
 *
 * Important implementation notes that affect us:
 *
 * - mozTCPSocket generates ondrain notifications when the send buffer is
 *   completely empty, not when when we go below the target buffer level.
 *
 * - bufferedAmount in the child process mozTCPSocket implementation only gets
 *   updated when the parent process relays a messages to the child process.
 *   When we are performing bulks sends, this means we will only see
 *   bufferedAmount go down when we receive an 'ondrain' notification and the
 *   buffer has hit zero.  As such, trying to do anything clever involving
 *   bufferedAmount other than seeing if it's at zero is not going to do
 *   anything useful.
 *
 * Leading to our strategy:
 *
 * - Always have a pre-fetched block of disk I/O to hand to the socket when we
 *   get a drain event so that disk I/O does not stall our pipeline.
 *   (Obviously, if the network is faster than our disk, there is very little
 *   we can do.)
 *
 * - Pick a page-size so that in the case where the network is extremely fast
 *   we are able to maintain good throughput even when our IPC overhead
 *   dominates.  We just pick one page-size; we intentionally avoid any
 *   excessively clever buffering regimes because those could back-fire and
 *   such effort is better spent on enhancing TCPSocket.
 */
define(function(require) {
'use strict';

var asyncFetchBlobAsUint8Array =
      require('../async_blob_fetcher').asyncFetchBlobAsUint8Array;

// Active sockets
var sockInfoByUID = {};

function open(uid, host, port, options) {
  var socket = navigator.mozTCPSocket;
  var sock = socket.open(host, port, options);

  var sockInfo = sockInfoByUID[uid] = {
    uid: uid,
    sock: sock,
    // Are we in the process of sending a blob?  The blob if so.
    activeBlob: null,
    // Current offset into the blob, if any
    blobOffset: 0,
    queuedData: null,
    // Queued write() calls that are ordering dependent on the Blob being
    // fully sent first.
    backlog: [],
  };

  sock.onopen = function(evt) {
    self.sendMessage(uid, 'onopen');
  };

  sock.onerror = function(evt) {
    var err = evt.data;
    var wrappedErr;
    if (err && typeof(err) === 'object') {
      wrappedErr = {
        name: err.name,
        type: err.type,
        message: err.message
      };
    }
    else {
      wrappedErr = err;
    }
    self.sendMessage(uid, 'onerror', wrappedErr);
  };

  sock.ondata = function(evt) {
    var buf = evt.data;
    self.sendMessage(uid, 'ondata', buf, [buf]);
  };

  sock.ondrain = function(evt) {
    // If we have an activeBlob and data already to send, then send it.
    // If we have an activeBlob but no data, then fetchNextBlobChunk has
    // an outstanding chunk fetch and it will issue the write directly.
    if (sockInfo.activeBlob && sockInfo.queuedData) {
      console.log('net-main(' + sockInfo.uid + '): Socket drained, sending.');
      sock.send(sockInfo.queuedData.buffer, 0, sockInfo.queuedData.byteLength);
      sockInfo.queuedData = null;
      // fetch the next chunk or close out the blob; this method does both
      fetchNextBlobChunk(sockInfo);
    } else {
      // Only forward the drain event if we aren't still taking over.
      self.sendMessage(uid, 'ondrain');
    }
  };

  sock.onclose = function(evt) {
    self.sendMessage(uid, 'onclose');
    delete sockInfoByUID[uid];
  };
}

function beginBlobSend(sockInfo, blob) {
  console.log('net-main(' + sockInfo.uid + '): Blob send of', blob.size,
              'bytes');
  sockInfo.activeBlob = blob;
  sockInfo.blobOffset = 0;
  sockInfo.queuedData = null;
  fetchNextBlobChunk(sockInfo);
}

/**
 * Fetch the next portion of the Blob we are currently sending.  Once the read
 * completes we will either send the data immediately if the socket's buffer is
 * empty or queue it up for sending once the buffer does drain.
 *
 * This logic is used both in the starting case and to help us reach a steady
 * state where (ideally) we always have a pre-fetched buffer of data ready for
 * when we hear the next drain event.
 *
 * We are also responsible for noticing that we're all done sending the Blob.
 */
function fetchNextBlobChunk(sockInfo) {
  // We are all done if the next fetch would be beyond the end of the blob
  if (sockInfo.blobOffset >= sockInfo.activeBlob.size) {
    console.log('net-main(' + sockInfo.uid + '): Blob send completed.',
                'backlog length:', sockInfo.backlog.length);
    sockInfo.activeBlob = null;

    // Drain as much of the backlog as possible.
    var backlog = sockInfo.backlog;
    while (backlog.length) {
      var sendArgs = backlog.shift();
      var data = sendArgs[0];
      if (data instanceof Blob) {
        beginBlobSend(sockInfo, data);
        return;
      }
      sockInfo.sock.send(data, sendArgs[1], sendArgs[2]);
    }
    // (the backlog is now empty)
    return;
  }

  var nextOffset =
        Math.min(sockInfo.blobOffset + self.BLOB_BLOCK_READ_SIZE,
                 sockInfo.activeBlob.size);
  console.log('net-main(' + sockInfo.uid + '): Fetching bytes',
              sockInfo.blobOffset, 'through', nextOffset, 'of',
              sockInfo.activeBlob.size);
  var blobSlice = sockInfo.activeBlob.slice(
                    sockInfo.blobOffset,
                    nextOffset);
  sockInfo.blobOffset = nextOffset;

  function gotChunk(err, binaryDataU8) {
    console.log('net-main(' + sockInfo.uid + '): Retrieved chunk');
    if (err) {
      // I/O errors are fatal to the connection; our abstraction does not let us
      // bubble the error.  The good news is that errors are highly unlikely.
      sockInfo.sock.close();
      return;
    }

    // If the socket has already drained its buffer, then just send the data
    // right away and re-schedule ourselves.
    if (sockInfo.sock.bufferedAmount === 0) {
      console.log('net-main(' + sockInfo.uid + '): Sending chunk immediately.');
      sockInfo.sock.send(binaryDataU8.buffer, 0, binaryDataU8.byteLength);
      fetchNextBlobChunk(sockInfo);
      return;
    }

    sockInfo.queuedData = binaryDataU8;
  };
  asyncFetchBlobAsUint8Array(blobSlice, gotChunk);
}

function close(uid) {
  var sockInfo = sockInfoByUID[uid];
  if (!sockInfo)
    return;
  var sock = sockInfo.sock;
  sock.close();
  sock.onopen = null;
  sock.onerror = null;
  sock.ondata = null;
  sock.ondrain = null;
  sock.onclose = null;
  self.sendMessage(uid, 'onclose');
  delete sockInfoByUID[uid];
}

function write(uid, data, offset, length) {
  var sockInfo = sockInfoByUID[uid];
  if (!sockInfo) {
    return;
  }

  // If there is an activeBlob, then the write must be queued or we would end up
  // mixing this write in with our Blob and that would be embarassing.
  if (sockInfo.activeBlob) {
    sockInfo.backlog.push([data, offset, length]);
    return;
  }

  // Fake an onprogress event so that we can delay wakelock expiration
  // as long as data still flows to the server.
  self.sendMessage(uid, 'onprogress', []);

  if (data instanceof Blob) {
    beginBlobSend(sockInfo, data);
  }
  else {
    sockInfo.sock.send(data, offset, length);
  }
}


function upgradeToSecure(uid) {
  var sockInfo = sockInfoByUID[uid];
  if (!sockInfo)
    return;
  sockInfo.sock.upgradeToSecure();
}


var self = {
  name: 'netsocket',
  sendMessage: null,

  /**
   * What size bites (in bytes) should we take of the Blob for streaming
   * purposes?  See the file header for the sizing rationale.
   */
  BLOB_BLOCK_READ_SIZE: 96 * 1024,

  process: function(uid, cmd, args) {
    switch (cmd) {
      case 'open':
        open(uid, args[0], args[1], args[2]);
        break;
      case 'close':
        close(uid);
        break;
      case 'write':
        write(uid, args[0], args[1], args[2]);
        break;
      case 'upgradeToSecure':
        upgradeToSecure(uid);
        break;
      default:
        console.error('Unhandled net-main command:', cmd);
        break;
    }
  }
};
return self;
});
