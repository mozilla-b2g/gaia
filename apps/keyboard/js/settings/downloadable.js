'use strict';

/* global Promise */

(function(exports) {

var Downloadable = function(database, options) {
  this.database = database;
  this.options = options;
  this.element = null;
  this.xhr = null;

  this.state = -1;
};

Downloadable.prototype.STATE_PENDING = 0;
Downloadable.prototype.STATE_PRELOADED = 1;
Downloadable.prototype.STATE_DOWNLOADABLE = 2;
Downloadable.prototype.STATE_DOWNLOADING = 3;
Downloadable.prototype.STATE_LOADING = 4;
Downloadable.prototype.STATE_LOADED = 5;
Downloadable.prototype.STATE_DELETING = 6;

Downloadable.prototype.DOWNLOAD_URL =
  'https://fxos.cdn.mozilla.net/dictionaries/1/%dictionaryName.dict';

Downloadable.prototype.ITEM_TEMPLATE_ELEMENT_ID =
  'dictionary-download-list-item';

Downloadable.prototype.start = function() {
  var template = document.getElementById(this.ITEM_TEMPLATE_ELEMENT_ID);
  var el = this.element =
    document.importNode(template.content, true).firstElementChild;
  el.querySelector('.label').textContent = this.options.label;

  el.addEventListener('click', this);

  if (this.options.preloaded) {
    this.state = this.STATE_PRELOADED;
  } else {
    this.state = this.STATE_PENDING;
  }

  this._updateUI();
};

Downloadable.prototype.setDownloaded = function(downloaded) {
  if (this.options.preloaded) {
    return;
  }

  if (downloaded) {
    this.state = this.STATE_LOADED;
  } else {
    this.state = this.STATE_DOWNLOADABLE;
  }

  this._updateUI();
};

Downloadable.prototype._updateUI = function() {
  var el = this.element;
  var aside = el.querySelector('aside');
  if (aside.firstElementChild) {
    aside.removeChild(aside.firstElementChild);
  }
  var status = el.querySelector('.status');

  switch (this.state) {
    case this.STATE_PENDING:
      status.dataset.l10nId = '';
      status.textContent = '';

      break;

    case this.STATE_PRELOADED:
      status.dataset.l10nId = 'preloaded';

      break;

    case this.STATE_DOWNLOADABLE:
      status.dataset.l10nId = 'downloadable';
      aside.appendChild(document.createElement('button'));
      aside.firstElementChild.dataset.l10nId = 'download';

      break;

    case this.STATE_DOWNLOADING:
      status.dataset.l10nId = 'downloading';
      aside.appendChild(document.createElement('span'));
      aside.firstElementChild.className = 'loading';

      break;

    case this.STATE_LOADING:
      status.dataset.l10nId = 'loading';
      aside.appendChild(document.createElement('span'));
      aside.firstElementChild.className = 'loading';

      break;

    case this.STATE_LOADED:
      status.dataset.l10nId = 'available';
      aside.appendChild(document.createElement('button'));
      aside.firstElementChild.dataset.l10nId = 'delete';

      break;

    case this.STATE_DELETING:
      status.dataset.l10nId = 'deleting';
      aside.appendChild(document.createElement('span'));
      aside.firstElementChild.className = 'loading';

      break;

    default:
      throw new Error('Downloadable: unknown state.');
  }
};

Downloadable.prototype.handleEvent = function(evt) {
  switch (this.state) {
    case this.STATE_PENDING:
      // Do nothing
      break;

    case this.STATE_PRELOADED:
      // Do nothing
      break;

    case this.STATE_DOWNLOADABLE:
      this.state = this.STATE_DOWNLOADING;
      this._updateUI();

      this._startDownload()
        .then(function(data) {
          this.state = this.STATE_LOADING;
          this._updateUI();

          return data;
        }.bind(this))
        .then(this._insertIntoDatabase.bind(this))
        .then(function() {
          this.state = this.STATE_LOADED;
          this._updateUI();
        }.bind(this))
        .catch(function(e) {
          this.state = this.STATE_DOWNLOADABLE;
          this._updateUI();

          e && console.error(e);
        }.bind(this));

      break;

    case this.STATE_DOWNLOADING:
      var cancelPromptStr =
        navigator.mozL10n.get('cancelPrompt') || 'cancelPrompt';
      if (!window.confirm(cancelPromptStr)) {
        return;
      }

      this.xhr.abort();

      break;

    case this.STATE_LOADING:
      // Do nothing

      break;

    case this.STATE_LOADED:
      var deletePromptStr =
        navigator.mozL10n.get('deletePrompt') || 'deletePrompt';
      if (!window.confirm(deletePromptStr)) {
        return;
      }

      this.state = this.STATE_DELETING;
      this._updateUI();

      this._deleteFromDatabase()
        .then(function() {
          this.state = this.STATE_DOWNLOADABLE;
          this._updateUI();
        }.bind(this))
        .catch(function(e) {
          this.state = this.STATE_LOADED;
          this._updateUI();

          e && console.error(e);
        }.bind(this));

      break;

    case this.STATE_DELETING:
      // Do nothing

      break;

    default:
      throw new Error('Downloadable: unknown state.');
  }
};

Downloadable.prototype._startDownload = function() {
  var p = new Promise(function(resolve, reject) {
    var xhr = this.xhr =
      new XMLHttpRequest({ mozSystem: true, mozAnon: true });
    var url =
      this.DOWNLOAD_URL.replace('%dictionaryName', this.options.name);
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
      if (xhr.status !== 200) {
        reject();
      } else {
        resolve(xhr.response);
      }
      this.xhr = null;
    }.bind(this);

    xhr.onabort = function() {
      reject();
      this.xhr = null;
    }.bind(this);

    xhr.onerror = function(e) {
      reject(e);
      this.xhr = null;
    }.bind(this);
    xhr.send();
  }.bind(this));

  return p;
};

Downloadable.prototype._insertIntoDatabase = function(data) {
  return this.database.setItem(this.options.name, data);
};

Downloadable.prototype._deleteFromDatabase = function() {
  return this.database.deleteItem(this.options.name);
};

exports.Downloadable = Downloadable;

}(window));
