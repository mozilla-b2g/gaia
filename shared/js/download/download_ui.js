
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
    this.numberOfButtons = name === 'file_not_found' ? 1 : 2;
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
    FILE_OPEN_ERROR: new DownloadType('file_open_error', ['danger'])
  };

  // Confirm dialog container
  var confirm = null;

 /**
  * Request auxiliary object to support asynchronous calls
  */
  var Request = function() {
    this.cancel = function() {
      removeConfirm();
      if (typeof this.oncancel === 'function') {
        this.oncancel();
      }
    };

    this.confirm = function() {
      removeConfirm();
      if (typeof this.onconfirm === 'function') {
        this.onconfirm();
      }
    };
  };

  function removeConfirm() {
    if (confirm === null) {
      return;
    }

    document.body.removeChild(confirm);
    confirm = null;
  }

  // When users click or hold on home button the confirmation should be removed
  window.addEventListener('home', removeConfirm);
  window.addEventListener('holdhome', removeConfirm);

  function createConfirm(type, req, download) {
    var _ = navigator.mozL10n.get;

    confirm = document.createElement('form');
    confirm.setAttribute('role', 'dialog');
    confirm.setAttribute('data-type', 'confirm');

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

    document.body.appendChild(confirm);
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

        if (download.state === 'finalized') {
          type = TYPES.FAILED;
        }
      }

      LazyLoader.load(libs, createConfirm.call(this, type, req, download));
    }, 0);

    return req;
  }

  return {
    show: show,

    hide: removeConfirm,

    get TYPE() {
      return TYPES;
    }
  };
}());
