
'use strict';

/**
 *  This file defines a component to show download confirmations
 *
 * - Stop download (Are you sure you want to stop the download?)
 * - Download stopped (Download was stopped. Try downloading again?)
 * - Download failed (xfile failed to download. Try downloading again?)
 * - Delete download (Delete xfile?)
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
 */
var DownloadUI = (function() {

  // Confirm dialog container
  var confirm = null;

 /**
  * Request auxiliary object to support asynchronous calls
  */
  var Request = function() {
    this.cancel = function() {
      removeConfirm();
      if (typeof this.oncancel === 'function') {
        window.setTimeout(function() {
          this.oncancel();
        }.bind(this), 0);
      }
    };

    this.confirm = function() {
      removeConfirm();
      if (typeof this.onconfirm === 'function') {
        window.setTimeout(function() {
          this.onconfirm();
        }.bind(this), 0);
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

  // When users click on home button the confirmation should be removed
  window.addEventListener('home', removeConfirm);

  function createConfirm(type, req, download) {
    var _ = navigator.mozL10n.get;

    var confirm = document.createElement('form');
    confirm.setAttribute('role', 'dialog');
    confirm.setAttribute('data-type', 'confirm');

    var dialog = document.createElement('section');

    // Header
    var header = document.createElement('h1');
    header.textContent = _(type + '_download_title');
    dialog.appendChild(header);

    // Message
    var message = document.createElement('p');
    if (type === DownloadUI.TYPE.FAILED ||
        type === DownloadUI.TYPE.DELETE) {
      message.textContent = _(type + '_download_message', {
        'name': download.fileName
      });
    } else {
      message.textContent = _(type + '_download_message');
    }
    dialog.appendChild(message);

    var menu = document.createElement('menu');
    menu.dataset['items'] = 2;

    // Left button
    var lButton = document.createElement('button');
    lButton.type = 'button';
    lButton.appendChild(
      document.createTextNode(_(type + '_download_left_button'))
    );

    lButton.addEventListener('click', req.cancel.bind(req));
    menu.appendChild(lButton);

    // Right button
    var rButton = document.createElement('button');
    rButton.type = 'button';
    if (type === DownloadUI.TYPE.STOP ||
        type === DownloadUI.TYPE.DELETE) {
      rButton.className = 'danger';
    } else {
      rButton.className = 'recommend';
    }

    rButton.appendChild(
      document.createTextNode(_(type + '_download_right_button'))
    );

    rButton.addEventListener('click', req.confirm.bind(req));
    menu.appendChild(rButton);

    dialog.appendChild(menu);
    confirm.appendChild(dialog);

    return confirm;
  }

  /*
   * Shows a confirmation depending on type. It returns a request object with
   * oncancel and onconfirm callbacks
   *
   * @param {String} Confirmation type
   *
   * @param {Object} It represents the download object
   */
  function show(type, download) {
    var req = new Request();

    window.setTimeout(function() {
      LazyLoader.load(['shared/style/buttons.css',
                       'shared/style/headers.css',
                       'shared/style/confirm.css',
                       'shared/js/l10n.js'], function loaded() {
        confirm = createConfirm(type, req, download);
        document.body.appendChild(confirm);
      });
    }, 0);

    return req;
  }

  return {
    show: show,

    hide: removeConfirm,

    TYPE: {
      STOP: 'stop',
      STOPPED: 'stopped',
      FAILED: 'failed',
      DELETE: 'delete'
    }
  };
}());
