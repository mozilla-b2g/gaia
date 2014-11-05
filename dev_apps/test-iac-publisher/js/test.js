'use strict';

// To display the current number of connections in the 'numConns' field. If
// |cancelConns| is true, it will cancel all the current connections first.
function updateNumConns(cancelConns, callback) {
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.getConnections().then(function(conns) {
      if (cancelConns && conns.length > 0) {
        conns.forEach(function(conn) {
          conn.cancel();
        });
        updateNumConns(false, callback);
        return;
      }

      var numConns = document.getElementById('numConns');
      numConns.value = conns.length;

      if (callback) {
        callback();
      }
    });
  };
}

// To display the received message returned by the subscriber app in the DOM 
// element identified by |elementId|. If |message| is assigned, it will be 
// tested by the test_inter_app_comm.py.
function updateReceivedMsg(elementId, message) {
  var receivedMsg = document.getElementById(elementId);
  if (receivedMsg) {
    document.body.removeChild(receivedMsg);
  }

  if (!message) {
    return;
  }

  receivedMsg = document.createElement('input');
  receivedMsg.type = 'text';
  receivedMsg.value = message;
  receivedMsg.id = elementId;
  receivedMsg.style = 'width:90%';

  document.body.appendChild(receivedMsg);
}

// Do the IAC connection. |callback| is |function(accepted, result)|:
// - if |accepted| is true, |result| will return the accepted ports.
// - if |accepted| is false, |result| will return the rejected reason.
function connectToGetPorts(keyWord, rules, callback) {
  // Before running the callback to return connection result, update the number
  // of connetions first since the connection set might already change.
  function runCallback(accepted, result) {
    updateNumConns(false, function() {
      callback(accepted, result);
    });
  };

  // Cancel all the connections and reset the number of connections to 0.
  updateNumConns(true, function() {
    navigator.mozApps.getSelf().onsuccess = function() {
      var app = this.result;
      app.connect(keyWord, rules).then(function onConnectionAccepted(ports) {
        runCallback(true, ports);
      }, function onConnectionRejected(reason) {
        runCallback(false, reason);
      });
    };
  });
}

// |_tasks| contains the list of test fuctions, where each of them should call
// |tasks.next()| when completed or |tasks.finish()| to jump to the last one.
var tasks = {
  _tasks: [],
  _nextTaskIndex: 0,

  push: function(func) {
    this._tasks.push(func);
  },

  next: function() {
    if (this._nextTaskIndex >= this._tasks.length) {
      return;
    }

    var index = this._nextTaskIndex++;
    var task = this._tasks[index];

    try {
      task();
    } catch (ex) {
      // Run last task as clean up if possible.
      if (index != this._tasks.length - 1) {
        this.finish();
      }
    }
  },

  finish: function() {
    if (this._tasks.length == 0) {
      return;
    }

    this._tasks[this._tasks.length - 1]();
  },

  run: function() {
    this._nextTaskIndex = 0;
    this.next();
  }
};

// Test task #1: wrong keyword to connect.
tasks.push(function testWrongKeyword() {
  connectToGetPorts("test-foo", null, function(accepted, result) {
    if (accepted) {
      updateReceivedMsg("receivedStrMsg", "Error! Should reject to connect " +
                        "because the keyword 'test-foo' is wrong.");
      tasks.finish();
      return;
    }

    tasks.next();
  });
});

// Test task #2: wrong rules.
// TODO Bug 907068 Create a scenario with mismatched rules (minimumAccessLevel,
// installOrigins) once IAC is allowed to non-certified apps. There's no such
// scenario for certified apps.

// Test task #3: correct rules.
tasks.push(function testCorrectRules() {
  connectToGetPorts("test", null, function(accepted, result) {
    if (!accepted) {
      updateReceivedMsg("receivedStrMsg", "Error! Should succeed to connect.");
      tasks.finish();
      return;
    }

    var ports = result;
    if (ports.length != 1) {
      updateReceivedMsg("receivedStrMsg", "Error! Should get exactly one port " +
                        "because there is only one subsriber app handling the " +
                        "'test' keyword");
      tasks.finish();
      return;
    }

    // Set the onmessage for the port to receive the message.
    var port = ports[0];
    port.onmessage = function(event) {
      updateReceivedMsg("receivedStrMsg", event.data.value);
      tasks.next();
    };

    // Start to post message through this port.
    var msgToSend = document.getElementById('msgToSend')
    port.postMessage({ value: msgToSend.value });
  });
});

//Test task #4: correct rules (with blob).
tasks.push(function testCorrectRulesWithBlob() {
  connectToGetPorts("test", null, function(accepted, result) {
    if (!accepted) {
      updateReceivedMsg("receivedBlobMsg", "Error! Should succeed to connect.");
      tasks.finish();
      return;
    }

    var ports = result;
    if (ports.length != 1) {
      updateReceivedMsg("receivedBlobMsg", "Error! Should get exactly one port " +
                        "because there is only one subsriber app handling the " + 
                        "'test' keyword");
      tasks.finish();
      return;
    }

    // Set the onmessage for the port to receive the message.
    var port = ports[0];
    port.onmessage = function(event) {
      var reader = new FileReader();
      reader.addEventListener("loadend", function() {
        updateReceivedMsg("receivedBlobMsg", window.atob(reader.result));
        tasks.next();
      });
      reader.readAsText(event.data);
    };

    // Start to post message through this port.
    var msgToSend = document.getElementById('msgToSend')
    port.postMessage(new Blob([window.btoa(msgToSend.value)]));
  });
});

// WARNING: All tasks should be pushed before this!!!
tasks.push(function cleanUp() {
  // A dummy function to handle the fallback of calling finish().
});


window.addEventListener('load', function() {
  // For clicking the 'sendButton' button.
  document.getElementById('sendButton').addEventListener('click', function() {
    updateReceivedMsg("receivedStrMsg");
    updateReceivedMsg("receivedBlobMsg");
    tasks.run();
  });

  // For clicking the 'cancelConnsButton' button.
  document.getElementById('cancelConnsButton').addEventListener('click', function() {
    updateReceivedMsg("receivedStrMsg");
    updateReceivedMsg("receivedBlobMsg");
    updateNumConns(true);
  });
});
