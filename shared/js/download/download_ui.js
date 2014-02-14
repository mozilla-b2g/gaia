
'use strict';

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

  var TYPES = {
    STOP: new DownloadType('stop', ['danger'], true),
    STOPPED: new DownloadType('stopped', ['recommend'], true),
    FAILED: new DownloadType('failed', ['recommend']),
    DELETE: new DownloadType('delete', ['danger']),
    UNSUPPORTED_FILE_TYPE: new DownloadType('unsupported_file_type',
                                            ['danger']),
    FILE_NOT_FOUND: new DownloadType('file_not_found', ['recommend', 'full'],
                                     true),
    FILE_OPEN_ERROR: new DownloadType('file_open_error', ['danger']),
    NO_SDCARD: new DownloadType('no_sdcard_found', ['recommend', 'full'], true),
    UNMOUNTED_SDCARD: new DownloadType('unmounted_sdcard', ['recommend',
                                       'full'], true),
    NO_PROVIDER: new DownloadType('no_provider', ['recommend', 'full'], true)
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
      confirm.innerHTML = '';
      return;
    }

    confirm = document.createElement('form');
    confirm.id = 'downloadConfirmUI';
    confirm.setAttribute('role', 'dialog');
    confirm.setAttribute('data-type', 'confirm');
    document.body.appendChild(confirm);
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

  function createConfirm(type, req, download) {
    var _ = navigator.mozL10n.get;

    addConfirm();

    var dialog = document.createElement('section');

    // Header
    var header = document.createElement('h1');
    header.textContent = _(type.name + '_download_title');
    dialog.appendChild(header);

    // Message
    var message = document.createElement('p');
    if (type.isPlainMessage) {
      message.textContent = _(type.name + '_download_message');
    } else {
      message.textContent = _(type.name + '_download_message', {
        'name': DownloadFormatter.getFileName(download)
      });
    }
    dialog.appendChild(message);

    var menu = document.createElement('menu');
    menu.dataset.items = type.numberOfButtons;

    if (type.numberOfButtons === 2) {
      // Left button
      var lButton = document.createElement('button');
      lButton.type = 'button';
      lButton.appendChild(
        document.createTextNode(_(type.name + '_download_left_button'))
      );

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

    rButton.appendChild(
      document.createTextNode(_(type.name + '_download_right_button'))
    );

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
    var _ = navigator.mozL10n.get;

    addActionMenu();

    var header = document.createElement('header');
    header.textContent = fileName;
    actionMenu.appendChild(header);

    var menu = document.createElement('menu');
    menu.classList.add('actions');

    actions.forEach(function addActionButton(action) {
      var button = document.createElement('button');
      button.id = action.id;
      button.textContent = _(action.title);
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
   * @param {Object} It represents the download object
   *
   * @param {Boolean} This optional parameter indicates if the library should
   *                  include BBs
   */
  function show(type, download, ignoreStyles) {
    var req = new Request();

    window.setTimeout(function() {
      var libs = ['shared/js/download/download_formatter.js'];
      if (!ignoreStyles) {
        libs.push.apply(libs, styleSheets);
      }

      // We have to discover the type of UI depending on state when type is null
      if (type === null) {
        type = TYPES.STOPPED;

        if (download.state === 'finalized' ||
            download.state === 'stopped' && download.error !== null) {
          type = TYPES.FAILED;
        }
      }

      LazyLoader.load(libs, createConfirm.call(this, type, req, download));
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

    get TYPE() {
      return TYPES;
    }
  };
}());
