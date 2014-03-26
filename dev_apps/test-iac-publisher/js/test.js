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

// To display the received message returned by the subscriber app. If |message|
// is assigned, it will be tested by the test_inter_app_comm.py.
function updateReceivedMsg(message) {
  var receivedMsg = document.getElementById('receivedMsg');
  if (receivedMsg) {
    document.body.removeChild(receivedMsg);
  }

  if (!message) {
    return;
  }

  receivedMsg = document.createElement('input');
  receivedMsg.type = 'text';
  receivedMsg.value = message;
  receivedMsg.id = 'receivedMsg';
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
      updateReceivedMsg("Error! Should reject to connect because the keyword " +
                        "'test-foo' is wrong.");
      tasks.finish();
      return;
    }

    tasks.next();
  });
});

// Test task #2: wrong rules (manifestURLs doesn't match).
tasks.push(function testWrongRulesManifestURLs() {
  var rules = {
    manifestURLs: ["app://test-iac-foo.gaiamobile.org/manifest.webapp"]
  };

  connectToGetPorts("test", rules, function(accepted, result) {
    if (accepted) {
      updateReceivedMsg("Error! Should reject to connect because " +
                        "rules.manifestURLs doesn't match.");
      tasks.finish();
      return;
    }

    tasks.next();
  });
});

// Test task #3: wrong rules (installOrigins doesn't match).
tasks.push(function testWrongRulesInstallOrigins() {
  var rules = {
    installOrigins: ["http://foo.test:8888"]
  };

  connectToGetPorts("test", rules, function(accepted, result) {
    if (accepted) {
      updateReceivedMsg("Error! Should reject to connect because " +
                        "rules.installOrigins doesn't match.");
      tasks.finish();
      return;
    }

    tasks.next();
  });
});

// Test task #4: correct rules.
tasks.push(function testCorrectRules() {
  var rules = {
    manifestURLs: ["app://test-iac-subscriber.gaiamobile.org/manifest.webapp"]
  };

  connectToGetPorts("test", rules, function(accepted, result) {
    if (!accepted) {
      updateReceivedMsg("Error! Should succeed to connect.");
      tasks.finish();
      return;
    }

    var ports = result;
    if (ports.length != 1) {
      updateReceivedMsg("Error! Should get exactly one port because there is " +
                        "only one subsriber app handling the 'test' keyword");
      tasks.finish();
      return;
    }

    // Set the onmessage for the port to receive the message.
    var port = ports[0];
    port.onmessage = function(event) {
      updateReceivedMsg(event.data.value);
      tasks.next();
    };

    // Start to post message theough this port.
    var msgToSend = document.getElementById('msgToSend')
    port.postMessage({ value: msgToSend.value });
  });
});

// WARNING: All tasks should be pushed before this!!!
tasks.push(function cleanUp() {
  // A dummy function to handle the fallback of calling finish().
});


window.addEventListener('load', function() {
  // For clicking the 'sendButton' button.
  document.getElementById('sendButton').addEventListener('click', function() {
    updateReceivedMsg();
    tasks.run();
  });

  // For clicking the 'cancelConnsButton' button.
  document.getElementById('cancelConnsButton').addEventListener('click', function() {
    updateReceivedMsg();
    updateNumConns(true);
  });
});
