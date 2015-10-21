'use strict';
/* exported DownloadUI */
/* global DownloadFormatter */
/* global LazyLoader */
/* global MimeMapper */

/**
 *  This file defines a component to show download confirmations
 *
 * - Stop download (Are you sure you want to stop the download?)
 * - Download stopped (Download was stopped. Try downloading again?)
 * - Download failed (xfile failed to download. Try downloading again?)
 * - Delete download (Delete xfile?)
 * - Unsupported file type
 * - File not found
 * - File open error
 * - No provider to share file
 *
 *  var request = DownloadUI.show(DownloadUI.TYPE.STOP, download);
 *
 *  request.oncancel = function() {
 *    alert('CANCEL');
 *  };
 *
 *  request.onconfirm = function() {
 *    alert('CONFIRM');
 *  };
 *
 *  WARNING: To use this library you need to include 'shared/js/l10n.js'
 *
 */
var DownloadUI = (function() {

  /**
   * Download type constructor
   *
   * @param {String} Type name
   * @param {Array} CSS classes to confirm button
   * @param {Boolean} Message without parameters
   */
  var DownloadType = function(name, classes, isPlainMessage) {
    this.name = name;
    this.classes = classes;
    this.isPlainMessage = isPlainMessage;
    this.numberOfButtons = classes.indexOf('full') !== -1 ? 1 : 2;
  };

  /**
   * Errors reported by the Downloads API.
   */
  var ERRORS = {
    NO_MEMORY: 2152857616,
    NO_SDCARD: 2152857618,
    UNMOUNTED_SDCARD: 2152857621
  };

  var TYPES = {
    STOP: new DownloadType('stop', ['danger'], true),
    STOPPED: new DownloadType('stopped', ['recommend'], true),
    FAILED: new DownloadType('failed', ['recommend']),
    DELETE: new DownloadType('delete', ['danger']),
    DELETE_ALL: new DownloadType('delete_all', ['danger']),
    UNSUPPORTED_FILE_TYPE: new DownloadType('unsupported_file_type',
                                            ['danger']),
    FILE_NOT_FOUND: new DownloadType('file_not_found', ['recommend', 'full'],
                                     true),
    FILE_OPEN_ERROR: new DownloadType('file_open_error', ['danger']),
    NO_SDCARD: new DownloadType('no_sdcard_found_2', ['recommend', 'full'],
                                true),
    UNMOUNTED_SDCARD: new DownloadType('unmounted_sdcard_2', ['recommend',
                                       'full'], true),
    NO_PROVIDER: new DownloadType('no_provider', ['recommend', 'full'], true),
    NO_MEMORY: new DownloadType('no_memory', ['recommend', 'full'], true)
  };

  var DownloadAction = function(id, type) {
    this.id = id;
    this.name = id.toLowerCase();
    this.title = this.name + '_downloaded_file';
    this.type = type;
  };

  var ACTIONS = {
    OPEN: new DownloadAction('OPEN', 'confirm'),
    SHARE: new DownloadAction('SHARE', 'confirm'),
    WALLPAPER: new DownloadAction('WALLPAPER', 'confirm'),
    RINGTONE: new DownloadAction('RINGTONE', 'confirm'),
    CANCEL: new DownloadAction('CANCEL', 'cancel')
  };

  // Confirm dialog containers
  var confirm = null;
  var actionMenu = null;

 /**
  * Request auxiliary object to support asynchronous calls
  */
  var Request = function() {
    this.cancel = function() {
      removeContainers();
      if (typeof this.oncancel === 'function') {
        this.oncancel();
      }
    };

    this.confirm = function(result) {
      removeContainers();
      if (typeof this.onconfirm === 'function') {
        this.result = result;
        this.onconfirm({
          target: this
        });
      }
    };
  };

  function removeContainers() {
    removeConfirm();
    removeActionMenu();
  }

  function addConfirm() {
    if (confirm !== null) {
      confirm.parentNode.removeChild(confirm);
    }

    confirm = document.createElement('form');
    confirm.id = 'downloadConfirmUI';
    confirm.setAttribute('role', 'dialog');
    confirm.setAttribute('data-type', 'confirm');
    confirm.setAttribute('data-z-index-level', '100');

    var screen = document.getElementById('screen');
    var container = screen || document.body;

    container.appendChild(confirm);
  }

  function removeConfirm() {
    if (confirm === null) {
      return;
    }

    confirm.innerHTML = '';
    confirm.style.display = 'none';
  }

  // When users click or hold on home button UIs should be removed
  window.addEventListener('home', removeContainers);
  window.addEventListener('holdhome', removeContainers);

  function l10n(element, l10nid, l10nargs) {
    // First set our args.
    if (l10nargs) {
      element.setAttribute('data-l10n-args', JSON.stringify(l10nargs));
    }
    // Then localize.
    element.setAttribute('data-l10n-id', l10nid);
    return element;
  }

  function createConfirm(type, req, downloads) {
    addConfirm();

    var dialog = document.createElement('section');

    // Header
    var header = document.createElement('h1');
    l10n(header, type.name + '_download_title');
    dialog.appendChild(header);

    // Message
    var message = document.createElement('p');
    if (type.isPlainMessage) {
      l10n(message, type.name + '_download_message');
    } else {
      var args = Object.create(null);
      if (type === TYPES.DELETE_ALL) {
        args.number = downloads.length;
      } else {
        args.name = DownloadFormatter.getFileName(downloads[0]);
      }
      l10n(message, type.name + '_download_message', args);
    }
    dialog.appendChild(message);

    var menu = document.createElement('menu');
    menu.dataset.items = type.numberOfButtons;

    if (type.numberOfButtons === 2) {
      // Left button
      var lButton = document.createElement('button');
      lButton.type = 'button';
      lButton.setAttribute('data-l10n-id',
                           type.name + '_download_left_button');

      lButton.onclick = function l_cancel() {
        lButton.onclick = null;
        req.cancel();
      };
      menu.appendChild(lButton);
    }

    // Right button
    var rButton = document.createElement('button');
    rButton.type = 'button';
    type.classes.forEach(function(clazz) {
      rButton.classList.add(clazz);
    });

    rButton.setAttribute('data-l10n-id',
                         type.name + '_download_right_button');

    rButton.onclick = function r_confirm() {
      rButton.onclick = null;
      req.confirm();
    };
    menu.appendChild(rButton);

    dialog.appendChild(menu);
    confirm.appendChild(dialog);

    confirm.style.display = 'block';
  }

  function addActionMenu() {
    if (actionMenu !== null) {
      actionMenu.innerHTML = '';
      return;
    }

    actionMenu = document.createElement('form');
    actionMenu.id = 'downloadActionMenuUI';
    actionMenu.setAttribute('role', 'dialog');
    actionMenu.setAttribute('data-type', 'action');
    document.body.appendChild(actionMenu);
  }

  function removeActionMenu() {
    if (actionMenu === null) {
      return;
    }

    actionMenu.innerHTML = '';
    actionMenu.style.display = 'none';
  }

  function createActionMenu(req, download) {
    var actions = [ACTIONS.OPEN, ACTIONS.SHARE];

    var fileName = DownloadFormatter.getFileName(download);
    var type = MimeMapper.guessTypeFromFileProperties(fileName,
                                                      download.contentType);
    if (type.length > 0) {
      if (type.startsWith('image/')) {
        actions.push(ACTIONS.WALLPAPER);
      } else if (type.startsWith('audio/')) {
        actions.push(ACTIONS.RINGTONE);
      }
    }

    actions.push(ACTIONS.CANCEL);
    doCreateActionMenu(req, fileName, actions);
  }

  function doCreateActionMenu(req, fileName, actions) {
    addActionMenu();

    var header = document.createElement('header');
    header.textContent = fileName;
    actionMenu.appendChild(header);

    var menu = document.createElement('menu');
    menu.classList.add('actions');

    actions.forEach(function addActionButton(action) {
      var button = document.createElement('button');
      button.id = action.id;
      l10n(button, action.title);
      button.dataset.type = action.type;
      menu.appendChild(button);
      button.addEventListener('click', function buttonCliked(evt) {
        button.removeEventListener('click', buttonCliked);
        req[evt.target.dataset.type](ACTIONS[evt.target.id]);
      });
    });

    actionMenu.appendChild(menu);

    actionMenu.style.display = 'block';
  }

  var styleSheets = [
    'shared/style/buttons.css',
    'shared/style/headers.css',
    'shared/style/confirm.css'
  ];

  /*
   * Shows a confirmation depending on type. It returns a request object with
   * oncancel and onconfirm callbacks
   *
   * @param {String} Confirmation type
   *
   * @param {Array} It represents the download(s) object(s)
   *
   * @param {Boolean} This optional parameter indicates if the library should
   *                  include BBs
   */
  function show(type, downloads, ignoreStyles) {
    var req = new Request();

    downloads = Array.isArray(downloads) ? downloads : [downloads];

    window.setTimeout(function() {
      var libs = ['shared/js/download/download_formatter.js'];
      if (!ignoreStyles) {
        libs.push.apply(libs, styleSheets);
      }

      // We have to discover the type of UI depending on state when type is null
      if (type === null) {
        type = TYPES.STOPPED;

        var download = downloads[0];
        if (download.state === 'finalized' ||
            download.state === 'stopped' && download.error !== null) {
          type = TYPES.FAILED;
        }
      }

      LazyLoader.load(libs, createConfirm.call(this, type, req, downloads));
    }, 0);

    return req;
  }

  function showActions(download) {
    var req = new Request();

    window.setTimeout(function() {
      LazyLoader.load(['shared/js/mime_mapper.js',
                       'shared/js/download/download_formatter.js',
                       'shared/style/action_menu.css'],
                      createActionMenu.call(this, req, download));
    }, 0);

    return req;
  }

  return {
    show: show,

    showActions: showActions,

    hide: removeContainers,

    get ERRORS() {
      return ERRORS;
    },

    get TYPE() {
      return TYPES;
    }
  };
}());
