'use strict';

/* global LazyLoader */

(function(exports) {
  /**
   * Manage Notifications in Lockscreen:
   * Handle notification changes from Notifications, and
   * update Lockscreen visuals accordingly.
   *
   * @constructor LockScreenPhysicalWeb
   */
  var LockScreenPhysicalWeb = function() {};

  LockScreenPhysicalWeb.prototype.start =
  function lspw_start(lockScreen, nfContainer, pwContainer) {
    this._lockScreen = lockScreen;
    this.nfContainer = nfContainer;
    this.pwContainer = pwContainer;
    this.pwContainer.querySelector('#physical-web-loading').onclick = e => {
      this.stopDiscovery(e);
    };
    this.configs = {
      listens: [
        'lockscreen-appopened',
        'lockscreen-appclosed'
      ]
    };
    this.configs.listens.forEach((ename) => {
      window.addEventListener(ename, this);
    });

    if (this._lockScreen.locked) {
      this.createNotification();
    }
  };

  LockScreenPhysicalWeb.prototype.handleEvent =
  function lspw_handleEvent(evt) {
    var detail = evt.detail || {};
    var { id, timestamp, node } = detail;
    switch (evt.type) {
      case 'lockscreen-appopened':
        this.createNotification();
      break;
      case 'lockscreen-appclosed':
        this.removeNotification();
        this.resetUi();
      break;
    }
  };

  LockScreenPhysicalWeb.prototype.createNotification =
  function lspw_createNotification() {
    if (this._notification) {
      try {
        this.nfContainer.removeChild(this._notification);
      }
      catch(ex) { /* quickndirty */ }
    }

    navigator.mozSettings.createLock().get('bluetooth.enabled').then(a => {
      if (!a['bluetooth.enabled']) {
        return;
      }
      var ele = this._notification = document.createElement('div');
      ele.dataset.type = 'desktop-notification';
      ele.role = 'link';
      ele.classList.add('notification');
      ele.innerHTML = `
        <img role="presentation" src="/lockscreen/style/images/physical_web.png">
        <div class="title-container">
          <div dir="auto" class="title">Physical Web</div>
        </div>
        <div class="detail">
          <div dir="auto" class="detail-content">Tap to find nearby devices</div>
        </div>`;

      ele.addEventListener('click', e => {
        e.preventDefault();

        this.startDiscovery();

        return false;
      });

      this.nfContainer.appendChild(ele);
    });
  };

  LockScreenPhysicalWeb.prototype.removeNotification =
  function lspw_createNotification() {
    if (this._notification) {
      this.nfContainer.removeChild(this._notification);
      this._notification = null;
    }
  };

  LockScreenPhysicalWeb.prototype.startDiscovery =
  function lspw_startDiscovery() {
    window.lockScreen.overlay.classList.add('physical-web');
    this.pwContainer.classList.add('loading');

    var notifications =
      this.pwContainer.querySelector('#physical-web-devices');

    navigator.mozBluetooth.defaultAdapter.startLeScan([]).then(handle => {
      this._handle = handle;

      console.log('Start scanning', handle);
      handle.ondevicefound = e => {
        console.log('Found something', new Uint8Array(e.scanRecord));
        var uri = this.parseRecord(e.scanRecord);
        if (uri) {
          if (notifications.querySelector(
              '*[data-device="' + e.device.address + '"]')) {
            return;
          }

          var ele = this._notification = document.createElement('div');
          ele.dataset.type = 'desktop-notification';
          ele.role = 'link';
          ele.classList.add('notification');
          ele.dataset.device = e.device.address;
          ele.innerHTML = `
            <img role="presentation" src="/lockscreen/style/images/physical_web.png">
            <div class="title-container">
              <div dir="auto" class="title"></div>
            </div>
            <div class="detail">
              <div dir="auto" role="url" class="detail-content detail-url"></div>
              <div dir="auto" role="content" class="detail-content"></div>
            </div>`;

          ele.querySelector('.title').textContent = uri;
          ele.dataset.uri = uri;

          ele.onclick = this.openUrl.bind(this);

          notifications.appendChild(ele);

          var x = new XMLHttpRequest({ mozSystem: true });
          x.onload = e => {
            var h = document.createElement('html');
            h.innerHTML = x.responseText;

            ele.querySelector('*[role="url"]').textContent = x.responseURL;

            var titleEl = h.querySelector('title');
            var metaEl = h.querySelector('meta[name="description"]');
            var bodyEl = h.querySelector('body');

            if (titleEl && titleEl.textContent) {
              ele.querySelector('.title').textContent = titleEl.textContent;
            }

            if (metaEl && metaEl.content) {
              ele.querySelector('*[role="content"]').textContent =
                metaEl.content;
            }
            else if (bodyEl && bodyEl.textContent) {
              ele.querySelector('*[role="content"]').textContent =
                bodyEl.textContent;
            }
          };
          x.onerror = err => console.error('Loading', uri, 'failed', err);
          x.open('GET', uri);
          x.send();
        }
      };

    }, err => console.error(err));
  };

  LockScreenPhysicalWeb.prototype.parseRecord =
  function lspw_parseRecord(scanRecord) {
    var data = new Uint8Array(scanRecord);

    for (var b = 0; b < 8; b++) {
      if (data[b] === 0x03 && data[b + 1] === 0x03 &&
          data[b + 2] === 0xd8 && data[b + 3] === 0xfe) {
        break;
      }
    }

    if (b === 8) {
      return false;
    }

    var schemes = [
      'http://www.',
      'https://www.',
      'http://',
      'https://',
      'urn:uuid:'
    ];

    var expansions = [
      '.com/',
      '.org/',
      '.edu/',
      '.net/',
      '.info/',
      '.biz/',
      '.gov/',
      '.com',
      '.org',
      '.edu',
      '.net',
      '.info',
      '.biz',
      '.gov',
    ];

    b += 4;
    var adLength = data[b++];
    var adType = data[b++];
    b += 2; // skip Service UUID
    var flags = data[b++];
    var txPower = data[b++];
    var scheme = data[b++];

    var text = schemes[scheme];
    // it has been 0x06 bytes since we read adLength, so take that into account
    for (var i = b, c = data[i]; i < b + adLength - 0x06; c = data[++i]) {
      if (c < expansions.length) {
        text += expansions[c];
      }
      else {
        text += String.fromCharCode(c);
      }
    }

    return text;
  };

  LockScreenPhysicalWeb.prototype.stopDiscovery =
  function lspw_stopDiscovery(e) {
    if (e) {
      e.preventDefault();
    }

    this.pwContainer.classList.remove('loading');
    navigator.mozBluetooth.defaultAdapter.stopLeScan(this._handle);

    this.resetUi();

    return false;
  };

  LockScreenPhysicalWeb.prototype.resetUi =
  function lspw_resetUi() {
    var notifications =
      this.pwContainer.querySelector('#physical-web-devices');
    notifications.innerHTML = '';
    window.lockScreen.overlay.classList.remove('physical-web');
  };

  LockScreenPhysicalWeb.prototype.openUrl =
  function lspw_openUrl(e) {
    var uri = e.target.dataset.uri;

    this.stopDiscovery();
    window.lockScreen.unlock();

    var a = new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: uri
      }
    });
    a.onerror = err => console.error('Opening', uri, 'failed', err);
  };

  /** @exports LockScreenPhysicalWeb */
  exports.LockScreenPhysicalWeb = LockScreenPhysicalWeb;
})(window);
