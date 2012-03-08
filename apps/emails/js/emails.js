
var debug = false;
function LOG(str) {
  if (debug)
    dump(str);
}

var MIMEParser = {
  parse: function mp_parse(msg) {
    var headers = {};

    var header = '';
    var buffer = '';

    var lines = msg.split(/\r\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      var newLine = true;
      for (var j = 0; j < line.length; j++) {
        var c = line[j];
        if (c == ':' && header == '') {
          header = buffer;
          buffer = '';
          continue;
        }

        if (newLine && c != ' ') {
          headers[header] = buffer;
          header = buffer = '';
        }
        buffer += c;
        newLine = false;
      }
    }

    if (header)
      headers[header] = buffer;

    return headers;
  }
};

var tcp = window.navigator.mozTCPSocket;

var STATE_CONNECTING = 0;
var STATE_CONNECTED = 1;
var STATE_DISCONNECTING = 3;
var STATE_DISCONNECTED = 4;

var IMAP = {
  state: STATE_DISCONNECTED,

  _tag: 0,
  connect: function imap_connect(config, action) {
    this.state = STATE_CONNECTING;
    this.config = config;
    this.action = action;

    tcp.start(config['imap'], config['port'], this);
  },

  disconnect: function imap_disconnect() {
    this.state = STATE_DISCONNECTING;
    this.send('LOGOUT');
  },

  stack: [],
  send: function imap_send(data, callback) {
    var tag = this._tag++;

    var interval = window.setInterval(function(self) {
      if (!self.stack[tag])
        return;
      var buffer = self.stack[tag];
      delete self.stack[tag];
      window.clearInterval(interval);

      callback(buffer);
    }, 20, this);

    this.stack[tag] = '';
    dump(data);

    tcp.write(tag + ' ' + data + '\r\n');
    return tag;
  },

  body: function imap_body(id, callback) {
    var cmd = 'FETCH ' + id + ' BODY[text]';
    this.send(cmd, function(data) {
      var regexp = /\* ([0-9]+) FETCH \(BODY\[TEXT\] {([0-9]+)}/gi;
      var result = regexp.exec(data);
      if (!result)
        return;

      var size = result[2];
      var start = result.index + result[0].length;
      var message = data.substr(start, parseInt(size));
      callback(message);
    });
  },

  fetch: function imap_fetch() {
    var cmd = 'SELECT inbox';
    this.send(cmd, (function(data) {
      var uid = parseInt(data.match(/\* ([0-9]+) EXISTS/)[1]);

      var previousUID = (uid - Mails.VIEW_SIZE);
      var cmd = 'FETCH ' + previousUID + ':' + uid + ' (BODY.PEEK[HEADER])';
      this.send(cmd, this.parseFetchHeaders.bind(this));

      var cmd = 'FETCH ' + previousUID + ':' + uid + ' FLAGS';
      this.send(cmd, this.parseFetchFlags);
    }).bind(this));
  },

  parseFetchHeaders: function imap_parseFetchHeaders(data) {
    var regexp = /\* ([0-9]+) FETCH \(BODY\[HEADER\] {([0-9]+)}/gi;

    var result = '';
    while ((result = regexp.exec(data)) != null) {

      var id = result[1];
      var size = result[2];

      var start = result.index + result[0].length;
      var message = data.substr(start, parseInt(size));
      Mails.append(id, MIMEParser.parse(message));
    }
  },

  parseFetchFlags: function imap_parseFetchFlags(data) {
    var regexp = /\* ([0-9]+) FETCH \(FLAGS \(((?:\\[A-Z]+ ?)+)\)\)/gi;

    var result = '';
    while ((result = regexp.exec(data)) != null) {

      var id = result[1];
      var flags = result[2].replace('\\', '').toLowerCase().split(' ');

      for (var i = 0; i < flags.length; i++)
        Mails.flag(id, flags[i]);
    }
  },

  onConnect: function imap_connect() {
    this.state = STATE_CONNECTED;
    var config = this.config;

    var cmd = 'LOGIN ' + config['username'] + ' ' + config['password'];
    this.send(cmd, (function(data) {
      if (/Success/.test(data)) {
        this.state = STATE_CONNECTED;

        if (this[this.action])
          this[this.action]();
      }
    }).bind(this));

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('connected', true, true, null);
    window.dispatchEvent(evt);
  },

  onDisconnect: function imap_disconnect() {
    this.state = STATE_DISCONNECTED;

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('disconnected', true, true, null);
    window.dispatchEvent(evt);
  },

  buffer: '',
  onDataAvailable: function imap_dataAvailable(data) {
    var commands = data.split('\r\n');
    commands.forEach((function(command) {
      this.buffer += command + '\r\n';

      var tag = command.split(' ')[0];
      switch (tag) {
        case '*':
          break;

        default:
          if (tag in this.stack) {
            this.stack[tag] = this.buffer;
            this.buffer = '';
          }
          break;
      }
    }).bind(this));
  }
};

var Configs = {
  get: function configs_get() {
    var accounts = [];

    for (var key in localStorage) {
      if (/^mail_/.test(key)) {
        var keys = {
          'index': parseInt(key.replace(/^mail_/, ''))
        };

        var fields = localStorage[key].split(';');
        fields.pop();

        for (var i = 0; i < fields.length; i++) {
          var field = fields[i].split(':');
          keys[field[0]] = field[1] || '';
        }
        accounts.push(keys);
      }
    }

    accounts.sort(function(a, b) {
      return a['index'] - b['index'];
    });

    return accounts;
  }
};

var configs = Configs.get();
var config = 0;
function readNextConfig() {
  var current = configs[config];
  if (!current) {
    Settings.show();
    return null;
  }

  return current;
}

var Mails = {
  VIEW_SIZE: 25,

  get view() {
    delete this.view;
    return this.view = document.getElementById('messages');
  },

  get msg() {
    delete this.msg;
    return this.msg = document.getElementById('message');
  },

  handleEvent: function mails_handleEvent(evt) {
    switch (evt.type) {
      case 'load':
        var config = readNextConfig();
        if (config)
          IMAP.connect(config, 'fetch');
        break;

      case 'unload':
        tcp.stop();
        break;

      case 'keyup':
        if (evt.keyCode == evt.DOM_VK_ESCAPE &&
            this.msg.dataset.visible == 'true') {
          this.msg.dataset.visible = 'false';
          evt.preventDefault();
        }
        break;
    }
  },

  refresh: function mails_refresh() {
    var view = this.view;
    while (view.hasChildNodes())
      view.removeChild(view.lastChild);

    configs = Configs.get();
    config = 0;
    IMAP.connect(readNextConfig(), 'fetch');
  },

  append: function mails_append(id, headers) {
    var mail = document.createElement('div');
    mail.id = id;
    mail.className = 'mail';

    var from = document.createElement('div');
    from.className = 'from';
    from.appendChild(document.createTextNode(headers['From']));
    mail.appendChild(from);

    var subject = document.createElement('div');
    subject.className = 'subject';
    subject.appendChild(document.createTextNode(headers['Subject']));
    mail.appendChild(subject);

    var date = document.createElement('div');
    date.className = 'date';
    date.appendChild(document.createTextNode(headers['Date']));
    mail.dataset.date = headers['Date'];
    mail.appendChild(date);

    var mailDate = new Date(headers['Date']);
    var target = null;

    var view = this.view;
    var childs = view.children;
    for (var i = 0; i < childs.length; i++) {
      var child = childs[i];
      var date = new Date(child.dataset.date);

      if (mailDate > date) {
        target = child;
        break;
      }
    }
    this.view.insertBefore(mail, target);
  },

  flag: function mails_flag(id, flag) {
    var mail = document.getElementById(id);
    if (!mail)
      return;

    mail.classList.add(flag);
  },

  show: function mails_show(id) {
    var mail = document.getElementById(id);
    var view = this.msg;

    IMAP.body(id, function(msg) {
      mail.classList.add('seen');

      view.firstElementChild.value = msg;
      view.dataset.visible = 'true';
    });
  },

  hide: function mails_hide() {
    this.msg.dataset.visible = 'false';
  }
};

['load', 'unload', 'keyup'].forEach(function(type) {
  window.addEventListener(type, Mails, true);
});


var Settings = {
  get panel() {
    delete this.panel;
    return this.panel = document.getElementById('settings');
  },

  show: function settings_show() {
    this.panel.dataset.visible = 'true';

    var accounts = Configs.get();
    if (!accounts.length) {
      this.add();
      return;
    }

    for (var i = 0; i < accounts.length; i++)
      this.add(accounts[i]);
  },

  hide: function settings_hide() {
    this.panel.dataset.visible = 'false';
  },

  add: function settings_add(keys) {
    keys = keys || {};

    var account = document.createElement('div');
    account.className = 'account';

    function addInputField(title, name, type) {
      var label = document.createElement('label');
      label.appendChild(document.createTextNode(title));

      var input = document.createElement('input');
      input.name = name;
      input.type = type;
      if (type == 'text' || type == 'password') {
        input.value = keys[name] || '';
      } else if (type == 'checkbox') {
        input.checked = keys[name] || '';
      }
      label.appendChild(input);

      account.appendChild(label);
    }

    addInputField('Email Address', 'email', 'text');
    addInputField('Username', 'username', 'text');
    addInputField('Password', 'password', 'password');
    addInputField('SMTP Server', 'smtp', 'text');
    addInputField('IMAP Server', 'imap', 'text');
    addInputField('Server Port', 'port', 'text');
    addInputField('Security (SSL)', 'ssl', 'checkbox');

    var buttons = document.createElement('span');
    buttons.className = 'buttons';

    var save = document.createElement('button');
    save.addEventListener('click', function save(evt) {
      Settings.save(evt.target.parentNode.parentNode);
    });
    save.textContent = 'Save';
    buttons.appendChild(save);

    var remove = document.createElement('button');
    remove.addEventListener('click', function remove(evt) {
      Settings.remove(evt.target.parentNode.parentNode);
    });
    remove.textContent = 'Remove';
    buttons.appendChild(remove);

    account.appendChild(buttons);
    this.panel.insertBefore(account, this.panel.lastChild);
  },

  save: function settings_save(target) {
    // For simplicity the settings use local storage for the moment
    // and the key used to save an account is it's index in the DOM
    // tree.

    var str = '';
    var childs = this._getFields(target);
    for (var i = 0; i < childs.length; i++) {
      var child = childs[i];

      if (child.type == 'checkbox') {
        str += (child.name + ':' + child.checked);
      } else {
        str += (child.name + ':' + child.value);
      }
      str += ';';
    }

    var key = this._getKey(target);
    localStorage[key] = str;
  },

  remove: function settings_remove(target) {
    var key = this._getKey(target);
    delete localStorage[key];

    this.panel.removeChild(target);
    if (this._getFields(this.panel).length == 0)
      this.add();
  },

  _getKey: function settings_getKey(node) {
    return 'mail_' + Array.prototype.indexOf.call(this.panel.childNodes, node);
  },

  _getFields: function settings_getFiels(target) {
    return target.querySelectorAll('input');
  }
};

