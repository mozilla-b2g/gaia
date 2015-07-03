'use strict';

var PORT = 33334;
var THIS_ORIGIN = 'app://acl-daemon.gaiamobile.org';
var EMAIL_ORIGIN = 'app://email.gaiamobile.org';

window.onerror = function(e) {
  document.write('Global ERROR: ' + e);
};

function $(el) {
  return document.getElementById(el);
}

function getRandomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '');
}

function App() {
  this.logContainer = document.getElementById('log');
  this.server = null;
  this.socket = null;
  this.buffer = '';
  this.notifications = [];

  $('launch').onclick = this.launchApp.bind(this);
  $('kill').onclick = this.killApp.bind(this);
  $('minimize').onclick = this.minimizeApp.bind(this);
  $('minimize-wrong').onclick = this.minimizeEmailApp.bind(this);
  $('launch-minimize').onclick = this.launchAndMinimize.bind(this);
  $('notify').onclick = this.sendNotification.bind(this);
  $('notify-remove').onclick = this.removeNotifications.bind(this);
  $('notify-silent').onclick = this.silentNotification.bind(this);
  $('remove-launch').onclick = this.removeLaunch.bind(this);
}

App.prototype.log = function(msg) {
  var log = document.createElement('p');
  log.textContent = msg;
  this.logContainer.insertBefore(log, this.logContainer.firstChild);
};

App.prototype.start = function() {
  this.createServer();
};

App.prototype.createServer = function() {
  try {
    this.server = navigator.mozTCPSocket.listen(PORT);
  } catch (e) {
    this.log('Failed to create server: ' + e);
  }
  this.log('Creating server, listening on ' + PORT);
  this.server.onconnect = this.handleConnect.bind(this);
  this.server.onerror = function(e) {
    this.log('Error creating server: ' + e);
  }.bind(this);
};

App.prototype.handleConnect = function(socket) {
  this.log('Connected to System App');
  this.socket = socket;
  this.socket.ondata = this.handleData.bind(this);
};

App.prototype.handleData = function(evt) {
  var data = evt.data;
  this.buffer += data;
  var i = this.buffer.indexOf('\n');
  while (i !== -1) {
    var msg = this.buffer.slice(0, i);
    this.buffer = this.buffer.slice(i + 1);
    this.handleMessage(msg);
    i = this.buffer.indexOf('\n');
  }
};

App.prototype.handleMessage = function(msg) {
  try {
    msg = JSON.parse(msg);
  } catch (e) {
    this.log('Unable to parse incoming msg ' + msg);
    return;
  }

  switch (msg.action) {
    case 'notify-click':
      this.log('Got click event, remove then launch');
      this.removeLaunch();
      break;

    default:
      this.log('Unrecognized action: ' + msg.action);
  }
};

App.prototype.serializeMessage = function(obj) {
  return JSON.stringify(obj) + '\n';
};

App.prototype.launchApp = function() {
  if (!this.socket) {
    this.log('Cannot launch app, no connection');
    return;
  }
  this.log('Launching email');
  var msg = this.serializeMessage({
    'action': 'launch',
    'origin': EMAIL_ORIGIN
  });
  this.socket.send(msg);
};

App.prototype.killApp = function() {
  if (!this.socket) {
    this.log('Cannot kill app, no connection');
    return;
  }
  this.log('Killing self');
  var msg = this.serializeMessage({
    'action': 'kill',
    'origin': THIS_ORIGIN
  });
  this.socket.send(msg);
};

App.prototype.sendNotification = function() {
  if (!this.socket) {
    this.log('Cannot send notification, no connection');
    return;
  }
  this.log('Sending notification');
  var id = getRandomString();
  this.notifications.push(id);
  var msg = this.serializeMessage({
    'id': id,
    'action': 'notify',
    'origin': EMAIL_ORIGIN,
    'title': 'This is a notification!',
    'body': (new Date()).toUTCString()
  });
  this.socket.send(msg);
};

App.prototype.removeNotifications = function() {
  if (!this.socket) {
    this.log('Cannot remove notificaiton, no connection');
  }
  this.log('Removing notification');
  var id = this.notifications.pop();
  var msg = this.serializeMessage({
    'id': id,
    'origin': EMAIL_ORIGIN,
    'action': 'notify-remove'
  });
  this.socket.send(msg);
};

App.prototype.silentNotification = function() {
  if (!this.socket) {
    this.log('Cannot send silent notification, no connection');
  }
  this.log('Sending silent notification');
  var id = getRandomString();
  this.notifications.push(id);
  var msg = this.serializeMessage({
    'id': id,
    'origin': EMAIL_ORIGIN,
    'action': 'notify',
    'title': 'SHHHHHHH!!!',
    'silent': true
  });
  this.socket.send(msg);
};

App.prototype.minimizeApp = function() {
  if (!this.socket) {
    this.log('Cannot minimize, no connection');
    return;
  }
  this.log('Minimizing current app');
  var msg = this.serializeMessage({
    'action': 'minimize',
    'origin': THIS_ORIGIN
  });
  this.socket.send(msg);
};

App.prototype.minimizeEmailApp = function() {
  if (!this.socket) {
    this.log('Cannot minimize, no connection');
    return;
  }
  this.log('Attempting to minimize email, does nothing if email not running');
  var msg = this.serializeMessage({
    'action': 'minimize',
    'origin': EMAIL_ORIGIN
  });
  this.socket.send(msg);
};

App.prototype.launchAndMinimize = function() {
  if (!this.socket) {
    this.log('Cannot launch app, no connection');
    return;
  }
  setTimeout(this.minimizeEmailApp.bind(this), 2000);
  this.log('Launching email, will minimize shortly');
  var msg = this.serializeMessage({
    'action': 'launch',
    'origin': EMAIL_ORIGIN
  });
  this.socket.send(msg);
};

App.prototype.removeLaunch = function() {
  if (!this.socket) {
    this.log('Cannot launch app, no connection');
    return;
  }
  this.log('Sending remove and launch simultaneously');
  var id = this.notifications.pop();
  var msg = this.serializeMessage({
    'id': id,
    'origin': EMAIL_ORIGIN,
    'action': 'notify-remove'
  });
  msg += this.serializeMessage({
    'action': 'launch',
    'origin': EMAIL_ORIGIN
  });
  this.socket.send(msg);
};

window.addEventListener('DOMContentLoaded', function() {
  window.app = new App();
  window.app.start();
});

