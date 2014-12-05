/* global BaseUI */

'use strict';
(function(exports) {
  /**
   * Handle Web API permissions such as geolocation, getUserMedia
   * @class AppPermissionDialog
   */
  function AppPermissionDialog(app) {
    this.app = app;
    this.pending = [];
    this.containerElement = this.app.element;
    this.app.element.addEventListener('mozChromeEvent', this);
    this.app.element.addEventListener('mozbrowserfullscreen-origin-change',
      this);
  }

  AppPermissionDialog.prototype = Object.create(BaseUI.prototype);
  AppPermissionDialog.prototype.name = 'AppPermissionDialog';
  AppPermissionDialog.prototype.EVENT_PREFIX = 'app-permission-dialog';
  AppPermissionDialog.prototype.DEBUG = true;

  AppPermissionDialog.prototype.permissionType = undefined;
  AppPermissionDialog.prototype.currentPermissions = undefined;
  AppPermissionDialog.prototype.fullscreenRequest = undefined;
  AppPermissionDialog.prototype.isVideo = false;
  AppPermissionDialog.prototype.isAudio = false;
  /**
   * special dialog for camera selection while in app mode and
   * permission is granted
   */
  AppPermissionDialog.prototype.isCamSelector = false;
  AppPermissionDialog.prototype.responseStatus = undefined;
  /**
   * A queue of pending requests. Callers of requestPermission() must be
   * careful not to create an infinite loop!
   */
  AppPermissionDialog.prototype.pending = undefined;

  /**
   * The ID of the request currently visible on the screen. This has the value
   * "undefined" when there is no request visible on the screen.
   */
  AppPermissionDialog.prototype.currentRequestId = undefined;

  /**
   * start the PermissionManager to init variables and listeners
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype._fetchElements = function() {
    // Div over in which the permission UI resides.
    this.overlay = this.element =
      this.containerElement.querySelector('.app-permission-dialog');
    this.title = this.element.querySelector('.permission-title');
    this.message = this.element.querySelector('.permission-message');
    this.moreInfo = this.element.querySelector('.permission-more-info');
    this.moreInfoLink =
      this.element.querySelector('.permission-more-info-link');
    this.hideInfoLink =
      this.element.querySelector('.permission-hide-info-link');
    this.moreInfoBox = this.element.querySelector('.permission-more-info-box');

    // "Yes"/"No" buttons on the permission UI.
    this.buttons = this.element.querySelector('.permission-buttons');
    this.yes = this.element.querySelector('.permission-yes');
    this.no = this.element.querySelector('.permission-no');

    // Remember the choice checkbox
    this.remember = this.element.querySelector('.permission-remember-checkbox');
    this.rememberSection =
      this.element.querySelector('.permission-remember-section');
    this.deviceSelector =
      this.element.querySelector('.permission-device-selector');
    this.devices = this.element.querySelector('.permission-devices');

    var self = this;
    this.rememberSection.addEventListener('click',
      function onLabelClick() {
      self.remember.checked = !self.remember.checked;
    });

    this.discardPermissionRequest = this.discardPermissionRequest.bind(this);

    // Ensure that the focus is not stolen by the permission overlay, as
    // it may appears on top of a <select> element, and just cancel it.
    this.element.addEventListener('mousedown', function onMouseDown(evt) {
      evt.preventDefault();
    });
  };

  /**
   * Reset current values
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.cleanDialog = function() {
    this.permissionType = undefined;
    this.currentPermissions = undefined;
    this.currentChoices = {};
    this.isVideo = false;
    this.isAudio = false;
    this.isCamSelector = false;

    if (!this.element) {
      return;
    }

    //handled in showPermissionPrompt
    if (this.message.classList.contains('hidden')) {
      this.message.classList.remove('hidden');
    }
    if (!this.moreInfoBox.classList.contains('hidden')) {
      this.moreInfoBox.classList.add('hidden');
    }
    this.devices.innerHTML = '';
    if (!this.deviceSelector.classList.contains('hidden')) {
      this.deviceSelector.classList.add('hidden');
    }
    this.buttons.dataset.items = 2;
    this.no.style.display = 'inline';
  };

  /**
   * Event handler interface for mozChromeEvent.
   * @memberof PermissionManager.prototype
   * @param {DOMEvent} evt The event.
   */
  AppPermissionDialog.prototype.handleEvent = function(evt) {
    if (!this.element) {
      this.render();
    }
    this.cleanDialog();
    if (evt.type === 'mozbrowserfullscreen-origin-change') {
      delete this.overlay.dataset.type;
      this.handleFullscreenOriginChange(evt.detail);
      return;
    }
    var detail = evt.detail;
    switch (detail.type) {
      case 'permission-prompt':
        if (detail.permissions) {
          if ('video-capture' in detail.permissions) {
            this.isVideo = true;

            // video selector is only for app
            if (detail.isApp && detail.isGranted &&
              detail.permissions['video-capture'].length > 1) {
              this.isCamSelector = true;
            }
          }
          if ('audio-capture' in detail.permissions) {
            this.isAudio = true;
          }
        } else { // work in <1.4 compatible mode
          if (detail.permission) {
            this.permissionType = detail.permission;
            if ('video-capture' === detail.permission) {
              this.isVideo = true;
            }
            if ('audio-capture' === detail.permission) {
              this.isAudio = true;
            }
          }
        }

        // Set default permission
        if (this.isVideo && this.isAudio) {
          this.permissionType = 'media-capture';
        } else {
          for (var permission in detail.permissions) {
            if (detail.permissions.hasOwnProperty(permission)) {
              this.permissionType = permission;
            }
          }
        }

        if (this.isAudio || this.isVideo) {
          // Set default options
          this.currentPermissions = detail.permissions;
          for (var permission2 in detail.permissions) {
            if (detail.permissions.hasOwnProperty(permission2)) {
              // gecko might not support audio/video option
              if (detail.permissions[permission2].length > 0) {
                this.currentChoices[permission2] =
                  detail.permissions[permission2][0];
              }
            }
          }
        }

        this.handlePermissionPrompt(detail);
        break;
      case 'cancel-permission-prompt':
        this.discardPermissionRequest();
        break;
    }
  };

  /**
   * Handle getUserMedia device select options
   * @memberof PermissionManager.prototype
   * @param {DOMEvent} evt The event.
   */
  AppPermissionDialog.prototype.optionClickhandler = function(evt) {
    var link = evt.target;
    if (!link) {
      return;
    }
    if (link.classList.contains('input-enable')) {
      if (link.checked) {
        this.currentChoices['video-capture'] = link.id;
      }
      var items = this.devices.querySelectorAll('input[type="checkbox"]');
      // Uncheck unselected option, allow 1 selection at same time
      for (var i = 0; i < items.length; i++) {
        if (items[i].id !== link.id) {
          items[i].checked = false;
          items[i].disabled = false; // Not allow to uncheck last option
        } else {
          link.disabled = true;
        }
      }
    }
  };

  /**
   * Show the request for the new domain
   * @memberof PermissionManager.prototype
   * @param {Object} detail The event detail object.
   */
  AppPermissionDialog.prototype.handleFullscreenOriginChange =
    function pm_handleFullscreenOriginChange(detail) {
    // If there's already a fullscreen request visible, cancel it,
    // we'll show the request for the new domain.
    if (this.fullscreenRequest !== undefined) {
      this.cancelRequest(this.fullscreenRequest);
      this.fullscreenRequest = undefined;
    }
    var _ = navigator.mozL10n.get;
    // The message to be displayed on the approval UI.
    var message =
      _('fullscreen-request', { 'origin': detail.fullscreenorigin });
    this.fullscreenRequest =
      this.requestPermission('fullscreen', detail.origin, detail.permission,
                             message, '', null,
                             function() {
                               document.mozCancelFullScreen();
                             });

  };

  /**
   * Prepare for permission prompt
   * @memberof PermissionManager.prototype
   * @param {Object} detail The event detail object.
   */
  AppPermissionDialog.prototype.handlePermissionPrompt = function(detail) {
    if (!this.element) {
      this.render();
    }
    if ((this.isAudio || this.isVideo) && !detail.isApp &&
      !this.isCamSelector) {
      // gUM always not remember in web mode
      this.remember.checked = false;
    } else {
      this.remember.checked = detail.remember ? true : false;
    }

    if (this.isAudio || this.isVideo) {
      if (!detail.isApp) {
        // Not show remember my choice option in website
        this.rememberSection.style.display = 'none';
      } else {
        this.rememberSection.style.display = 'block';
      }
    }

    this.overlay.dataset.type = this.permissionType;

    var message = '';
    var permissionID = 'perm-' + this.permissionType.replace(':', '-');
    var _ = navigator.mozL10n.get;

    if (detail.isApp) { // App
      message = _(permissionID + '-appRequest',
        { 'app': this.app.name });

      if (this.isCamSelector) {
        this.title.setAttribute('data-l10n-id', 'title-cam');
      } else {
        this.title.setAttribute('data-l10n-id', 'title-app');
      }
      navigator.mozL10n.setAttributes(
        this.deviceSelector,
        'perm-camera-selector-appRequest',
        { 'app': this.app.name }
      );
    } else { // Web content
      message = _(permissionID + '-webRequest', { 'site': detail.origin });

      this.title.setAttribute('data-l10n-id', 'title-web');
      navigator.mozL10n.setAttributes(
        this.deviceSelector,
        'perm-camera-selector-webRequest',
        { 'site': detail.origin }
      );
    }

    var moreInfoText = _(permissionID + '-more-info');
    var self = this;
    this.requestPermission(detail.id, detail.origin, this.permissionType,
      message, moreInfoText,
      function pm_permYesCB() {
        self.dispatchResponse(detail.id, 'permission-allow',
          self.remember.checked);
      },
      function pm_permNoCB() {
        self.dispatchResponse(detail.id, 'permission-deny',
          self.remember.checked);
    });
  };

  /**
   * Send permission choice to gecko
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.dispatchResponse =
    function(id, type, remember) {
      if (this.isCamSelector) {
        remember = true;
      }
      this.responseStatus = type;

      var response = {
        id: id,
        type: type,
        remember: remember
      };

      if (this.isVideo || this.isAudio || this.isCamSelector) {
        response.choices = this.currentChoices;
      }
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, response);
      window.dispatchEvent(event);
    };

  /**
   * Hide prompt
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.hidePermissionPrompt = function() {
    this.overlay.classList.remove('visible');
    this.devices.removeEventListener('click', this);
    this.devices.classList.remove('visible');
    this.currentRequestId = undefined;
    // Cleanup the event handlers.
    this.yes.removeEventListener('click', this.yesHandler);
    this.yes.callback = null;
    this.no.removeEventListener('click', this.noHandler);
    this.no.callback = null;
    this.moreInfoLink.removeEventListener('click',
      this.moreInfoHandler);
    this.hideInfoLink.removeEventListener('click',
      this.hideInfoHandler);
    if (!this.hideInfoLink.classList.contains('hidden')) {
      this.toggleInfo();
    }
  };

  /**
   * Show the next request, if we have one.
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.showNextPendingRequest = function() {
    if (this.pending.length === 0) {
      return;
    }
    var request = this.pending.shift();
    // bug 907075 Dismiss continuous same permission request but
    // dispatch mozContentEvent as well if remember is checked
    if (this.remember.checked) {
      if (this.permissionType === request.permission) {
        this.dispatchResponse(request.id, this.responseStatus,
          this.remember.checked);
        return;
      }
    }
    this.showPermissionPrompt(request.id,
                         request.message,
                         request.moreInfoText,
                         request.yescallback,
                         request.nocallback);
  };

  /**
   * Event listener function for the yes/no buttons.
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.clickHandler = function(evt) {
    var callback = null;
    if (evt.target === this.yes && this.yes.callback) {
      callback = this.yes.callback;
      this.responseStatus = 'permission-allow';
    } else if (evt.target === this.no && this.no.callback) {
      callback = this.no.callback;
      this.responseStatus = 'permission-deny';
    } else if (evt.target === this.moreInfoLink ||
               evt.target === this.hideInfoLink) {
      this.toggleInfo();
      return;
    }
    this.hidePermissionPrompt();
    this.app.focus();
    // Call the appropriate callback, if it is defined.
    if (callback) {
      window.setTimeout(callback, 0);
    }
    this.showNextPendingRequest();
  };

  AppPermissionDialog.prototype.toggleInfo = function() {
    this.moreInfoLink.classList.toggle('hidden');
    this.hideInfoLink.classList.toggle('hidden');
    this.moreInfoBox.classList.toggle('hidden');
  };

  /**
   * Queue or show the permission prompt
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.requestPermission =
    function(id, origin, permission, msg, moreInfoText,
             yescallback, nocallback) {
      if (this.currentRequestId !== undefined) {
        // There is already a permission request being shown, queue this one.
        this.pending.push({
          id: id,
          permission: permission,
          message: msg,
          origin: origin,
          moreInfoText: moreInfoText,
          yescallback: yescallback,
          nocallback: nocallback
        });
        return id;
      }
      this.showPermissionPrompt(id, msg, moreInfoText,
        yescallback, nocallback);

      return id;
    };

  AppPermissionDialog.prototype.view = function() {
    var view = `<div id="permission-dialog" role="dialog" class="generic-dialog">
          <div class="inner">
            <h1 id="permission-title"></h1>
            <h2 id="permission-message"></h2>
            <div id="permission-more-info" class="hidden">
              <a id="permission-more-info-link" data-l10n-id="more-info" href="#"></a>
              <a id="permission-hide-info-link" data-l10n-id="hide-info" href="#" class="hidden"></a>
              <div id="permission-more-info-box" class="hidden"> </div>
            </div>
            <div id="permission-remember-section">
              <label class="pack-checkbox">
                <input type="checkbox" id="permission-remember-checkbox" />
                <span></span>
              </label>
              <a data-l10n-id="remember-my-choice" id="permission-remember-label"></a>
            </div>
            <div id="permission-device-selector"></div>
            <ul id="permission-devices">
            </ul>
            <menu id="permission-buttons" data-items="2">
              <button id="permission-no"></button>
              <button id="permission-yes" class="affirmative"></button>
            </menu>
          </div>
        </div>
      </div>`;
    return view;
  };

  AppPermissionDialog.prototype.deviceListView = function(id, checked, label) {
    var view = `<div id="device-list-item-tmpl" class="hide">
      <!--
        <label class="device-list deviceEnable">
          <input class="input-enable" id="${id}" type="checkbox" ${checked}>
          <span></span>
        </label>
        <span class="device-item">${label}</span>
      -->
      </div>`;
    return view;
  };

  /**
   * Form the media source selection list
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.listDeviceOptions = function() {
    var _ = navigator.mozL10n.get;
    var self = this;
    var checked;

    // show description
    this.deviceSelector.classList.remove('hidden');
    // build device list
    this.currentPermissions['video-capture'].forEach(function(option) {
      // Match currentChoices
      checked = (self.currentChoices['video-capture'] === option) ?
          'checked=true disabled=true' : '';
      if (checked) {
        self.currentChoices['video-capture'] = option;
      }

      var item_li = document.createElement('li');
      item_li.className = 'device-cell';
      item_li.innerHTML = this.deviceListView(
                            option,
                            checked,
                            _('device-' + option)
                          );
      self.devices.appendChild(item_li);
    }, this);
    this.devices.addEventListener('click',
      this.optionClickhandler.bind(this));
    this.devices.classList.add('visible');
  };

  /**
   * Put the message in the dialog.
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.showPermissionPrompt = function(
        id, msg, moreInfoText, yescallback, nocallback) {
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    this.message.textContent = msg;
    if (moreInfoText) {
      // Show the "More info… " link.
      this.moreInfo.classList.remove('hidden');
      this.moreInfoHandler = this.clickHandler.bind(this);
      this.hideInfoHandler = this.clickHandler.bind(this);
      this.moreInfoLink.addEventListener('click', this.moreInfoHandler);
      this.hideInfoLink.addEventListener('click', this.hideInfoHandler);
      this.moreInfoBox.textContent = moreInfoText;
    }
    this.currentRequestId = id;

    // Not show the list if there's only 1 option
    if (this.isVideo && this.currentPermissions['video-capture'].length > 1) {
      this.listDeviceOptions();
    }

    // Set event listeners for the yes and no buttons
    var isSharedPermission = this.isVideo || this.isAudio ||
         this.permissionType === 'geolocation';

    this.yes.setAttribute('data-l10n-id',
      isSharedPermission ? 'share-' + this.permissionType : 'allow');
    this.yesHandler = this.clickHandler.bind(this);
    this.yes.addEventListener('click', this.yesHandler);
    this.yes.callback = yescallback;

    this.no.setAttribute('data-l10n-id', isSharedPermission ?
      'dontshare-' + this.permissionType : 'dontallow');
    this.noHandler = this.clickHandler.bind(this);
    this.no.addEventListener('click', this.noHandler);
    this.no.callback = nocallback;

    // customize camera selector dialog
    if (this.isCamSelector) {
      this.message.classList.add('hidden');
      this.rememberSection.style.display = 'none';
      this.buttons.dataset.items = 1;
      this.no.style.display = 'none';
      this.yes.setAttribute('data-l10n-id', 'ok');
    }
    // Make the screen visible
    this.overlay.classList.add('visible');
  };

  /**
   * Cancels a request with a specfied id. Request can either be
   * currently showing, or pending. If there are further pending requests,
   * the next is shown.
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.cancelRequest = function(id) {
    if (this.currentRequestId === id) {
      // Request is currently being displayed. Hide the permission prompt,
      // and show the next request, if we have any.
      this.hidePermissionPrompt();
      this.showNextPendingRequest();
    } else {
      // The request is currently not being displayed. Search through the
      // list of pending requests, and remove it from the list if present.
      for (var i = 0; i < this.pending.length; i++) {
        if (this.pending[i].id === id) {
          this.pending.splice(i, 1);
          break;
        }
      }
    }
  };

  /**
   * Clean current request queue and
   * send refuse permission request message to gecko
   * @memberof PermissionManager.prototype
   */
  AppPermissionDialog.prototype.discardPermissionRequest = function() {
    if (this.currentRequestId === undefined ||
        this.currentRequestId === null) {
      return;
    }

    if (this.currentRequestId == 'fullscreen') {
      if (this.no.callback) {
        this.no.callback();
      }
      this.fullscreenRequest = undefined;
    } else {
      this.dispatchResponse(this.currentRequestId, 'permission-deny', false);
    }

    this.hidePermissionPrompt();
    this.pending = [];
  };

  exports.AppPermissionDialog = AppPermissionDialog;
})(window);
