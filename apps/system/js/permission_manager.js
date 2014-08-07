/* global LazyLoader, AppWindowManager, applications, ManifestHelper*/
/* global Template*/
'use strict';
(function(exports) {
  /**
   * Handle Web API permissions such as geolocation, getUserMedia
   * @class PermissionManager
   * @requires Applications
   */
  function PermissionManager() {
  }

  PermissionManager.prototype = {

    currentOrigin: undefined,
    permissionType: undefined,
    currentPermissions: undefined,
    currentChoices: {}, //select choices
    fullscreenRequest: undefined,
    isVideo: false,
    isAudio: false,
    /**
     * special dialog for camera selection while in app mode and
     * permission is granted
     */
    isCamSelector: false,
    responseStatus: undefined,
    /**
     * A queue of pending requests. Callers of requestPermission() must be
     * careful not to create an infinite loop!
     */
    pending: [],

    /**
     * The ID of the next permission request. This is incremented by one
     * on every request, modulo some large number to prevent overflow problems.
     */
    nextRequestID: 0,

    /**
     * The ID of the request currently visible on the screen. This has the value
     * "undefined" when there is no request visible on the screen.
     */
    currentRequestId: undefined,

    /**
     * start the PermissionManager to init variables and listeners
     * @memberof PermissionManager.prototype
     */
    start: function pm_start() {
      // Div over in which the permission UI resides.
      this.overlay = document.getElementById('permission-screen');
      this.dialog = document.getElementById('permission-dialog');
      this.title = document.getElementById('permission-title');
      this.message = document.getElementById('permission-message');
      this.moreInfo = document.getElementById('permission-more-info');
      this.moreInfoLink = document.getElementById('permission-more-info-link');
      this.hideInfoLink = document.getElementById('permission-hide-info-link');
      this.moreInfoBox = document.getElementById('permission-more-info-box');

      // "Yes"/"No" buttons on the permission UI.
      this.buttons = document.getElementById('permission-buttons');
      this.yes = document.getElementById('permission-yes');
      this.no = document.getElementById('permission-no');

      // Remember the choice checkbox
      this.remember = document.getElementById('permission-remember-checkbox');
      this.rememberSection =
        document.getElementById('permission-remember-section');
      this.deviceSelector =
        document.getElementById('permission-device-selector');
      this.devices = document.getElementById('permission-devices');

      var self = this;
      this.rememberSection.addEventListener('click',
        function onLabelClick() {
        self.remember.checked = !self.remember.checked;
      });

      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('attentionscreenshow', this);
      /* On home/holdhome pressed, discard permission request.
       * XXX: We should make permission dialog be embededd in appWindow
       * Gaia bug is https://bugzilla.mozilla.org/show_bug.cgi?id=853711
       * Gecko bug is https://bugzilla.mozilla.org/show_bug.cgi?id=852013
       */
      this.discardPermissionRequest = this.discardPermissionRequest.bind(this);
      window.addEventListener('home', this.discardPermissionRequest);
      window.addEventListener('holdhome', this.discardPermissionRequest);

      /* If an application that is currently running needs to get killed for
       * whatever reason we want to discard it's request for permissions.
       */
      window.addEventListener('appterminated', (function(evt) {
        if (evt.detail.origin == this.currentOrigin) {
          this.discardPermissionRequest();
        }
      }).bind(this));

      // Ensure that the focus is not stolen by the permission overlay, as
      // it may appears on top of a <select> element, and just cancel it.
      this.overlay.addEventListener('mousedown', function onMouseDown(evt) {
        evt.preventDefault();
      });
    },

    /**
     * stop the PermissionManager to reset variables and listeners
     * @memberof PermissionManager.prototype
     */
    stop: function pm_stop() {
      this.currentOrigin = null;
      this.permissionType = null;
      this.currentPermissions = null;
      this.currentChoices = {};
      this.fullscreenRequest = null;
      this.isVideo = false;
      this.isAudio = false;
      this.isCamSelector = false;

      this.responseStatus = null;
      this.pending = [];
      this.nextRequestID = null;
      this.currentRequestId = null;

      this.overlay = null;
      this.dialog = null;
      this.title = null;
      this.message = null;
      this.moreInfo = null;
      this.moreInfoLink = null;
      this.moreInfoBox = null;

      this.remember = null;
      this.rememberSection = null;
      this.deviceSelector = null;
      this.devices = null;

      this.buttons = null;
      this.yes = null;
      this.no = null;

      window.removeEventListener('mozChromeEvent', this);
      window.removeEventListener('attentionscreenshow',this);
      window.removeEventListener('home', this);
      window.removeEventListener('holdhome', this);
    },

    /**
     * Reset current values
     * @memberof PermissionManager.prototype
     */
    cleanDialog: function pm_cleanDialog() {
      this.permissionType = undefined;
      this.currentPermissions = undefined;
      this.currentChoices = {};
      this.isVideo = false;
      this.isAudio = false;
      this.isCamSelector = false;

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
    },

    /**
     * Event handler interface for mozChromeEvent.
     * @memberof PermissionManager.prototype
     * @param {DOMEvent} evt The event.
     */
    handleEvent: function pm_handleEvent(evt) {
      var detail = evt.detail;
      switch (detail.type) {
        case 'permission-prompt':
          this.cleanDialog();
          this.currentOrigin = detail.origin;

          if (detail.permissions) {
            if ('video-capture' in detail.permissions) {
              this.isVideo = true;
              LazyLoader.load('shared/js/template.js');

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

                LazyLoader.load('shared/js/template.js');
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
          this.overlay.dataset.type = this.permissionType;

          if (this.isAudio || this.isVideo) {
            if (!detail.isApp) {
              // Not show remember my choice option in website
              this.rememberSection.style.display = 'none';
            } else {
              this.rememberSection.style.display = 'block';
            }

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
        case 'fullscreenoriginchange':
          delete this.overlay.dataset.type;
          this.handleFullscreenOriginChange(detail);
          break;
      }

      switch (evt.type) {
        case 'attentionscreenshow':
          this.discardPermissionRequest();
          break;
      }
    },

    /**
     * Handle getUserMedia device select options
     * @memberof PermissionManager.prototype
     * @param {DOMEvent} evt The event.
     */
    optionClickhandler: function pm_optionClickhandler(evt) {
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
    },

    /**
     * Show the request for the new domain
     * @memberof PermissionManager.prototype
     * @param {Object} detail The event detail object.
     */
    handleFullscreenOriginChange:
      function pm_handleFullscreenOriginChange(detail) {
      // If there's already a fullscreen request visible, cancel it,
      // we'll show the request for the new domain.
      if (this.fullscreenRequest !== undefined) {
        this.cancelRequest(this.fullscreenRequest);
        this.fullscreenRequest = undefined;
      }
      if (detail.fullscreenorigin !== AppWindowManager.getActiveApp().origin) {
        var _ = navigator.mozL10n.get;
        // The message to be displayed on the approval UI.
        var message =
          _('fullscreen-request', { 'origin': detail.fullscreenorigin });
        this.fullscreenRequest =
          this.requestPermission(detail.origin, detail.permission, message, '',
                                              /* yesCallback */ null,
                                              /* noCallback */ function() {
                                                document.mozCancelFullScreen();
                                              });
      }
    },

    /**
     * Prepare for permission prompt
     * @memberof PermissionManager.prototype
     * @param {Object} detail The event detail object.
     */
    handlePermissionPrompt: function pm_handlePermissionPrompt(detail) {
      if ((this.isAudio || this.isVideo) && !detail.isApp &&
        !this.isCamSelector) {
        // gUM always not remember in web mode
        this.remember.checked = false;
      } else {
        this.remember.checked = detail.remember ? true : false;
      }

      var message = '';
      var permissionID = 'perm-' + this.permissionType.replace(':', '-');
      var _ = navigator.mozL10n.get;

      if (detail.isApp) { // App
        var app = applications.getByManifestURL(detail.manifestURL);
        message = _(permissionID + '-appRequest',
          { 'app': new ManifestHelper(app.manifest).name });

        this.title.innerHTML = _('title-app');
        if (this.isCamSelector) {
          this.title.innerHTML = _('title-cam');
        }
        this.deviceSelector.innerHTML = _('perm-camera-selector-appRequest',
            { 'app': new ManifestHelper(app.manifest).name });
      } else { // Web content
        message = _(permissionID + '-webRequest', { 'site': detail.origin });

        this.title.innerHTML = _('title-web');
        this.deviceSelector.innerHTML = _('perm-camera-selector-webRequest',
            { 'site': detail.origin });
      }

      var moreInfoText = _(permissionID + '-more-info');
      var self = this;
      this.requestPermission(detail.origin, this.permissionType,
        message, moreInfoText,
        function pm_permYesCB() {
          self.dispatchResponse(detail.id, 'permission-allow',
            self.remember.checked);
        },
        function pm_permNoCB() {
          self.dispatchResponse(detail.id, 'permission-deny',
            self.remember.checked);
      });
    },
    /**
     * Send permission choice to gecko
     * @memberof PermissionManager.prototype
     */
    dispatchResponse: function pm_dispatchResponse(id, type, remember) {
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
    },

    /**
     * Hide prompt
     * @memberof PermissionManager.prototype
     */
    hidePermissionPrompt: function pm_hidePermissionPrompt() {
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
        this.moreInfoHandler);
      this.moreInfo.classList.add('hidden');
      // XXX: This is telling AppWindowManager to focus the active app.
      // After we are moving into AppWindow, we need to remove that
      // and call this.app.focus() instead.
      this.publish('permissiondialoghide');
    },

    publish: function(eventName, detail) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent(eventName, true, true, detail);
      window.dispatchEvent(event);
    },

    /**
     * Show the next request, if we have one.
     * @memberof PermissionManager.prototype
     */
    showNextPendingRequest: function pm_showNextPendingRequest() {
      if (this.pending.length === 0) {
        return;
      }
      var request = this.pending.shift();
      // bug 907075 Dismiss continuous same permission request but
      // dispatch mozContentEvent as well if remember is checked
      if (this.remember.checked) {
        if ((this.currentOrigin === request.origin) &&
          (this.permissionType === request.permission)) {
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
    },

    /**
     * Event listener function for the yes/no buttons.
     * @memberof PermissionManager.prototype
     */
    clickHandler: function pm_clickHandler(evt) {
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

      // Call the appropriate callback, if it is defined.
      if (callback) {
        window.setTimeout(callback, 0);
      }
      this.showNextPendingRequest();
    },

    toggleInfo: function pm_toggleInfo() {
      this.moreInfoLink.classList.toggle('hidden');
      this.hideInfoLink.classList.toggle('hidden');
      this.moreInfoBox.classList.toggle('hidden');
    },

    /**
     * Queue or show the permission prompt
     * @memberof PermissionManager.prototype
     */
    requestPermission: function pm_requestPermission(origin, permission,
                                     msg, moreInfoText,
                                     yescallback, nocallback) {
      var id = this.nextRequestID;
      this.nextRequestID = (this.nextRequestID + 1) % 1000000;

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
    },

    /**
     * Form the media source selection list
     * @memberof PermissionManager.prototype
     */
    listDeviceOptions: function pm_listDeviceOptions() {
      var _ = navigator.mozL10n.get;
      var self = this;
      var template = new Template('device-list-item-tmpl');
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
        item_li.innerHTML = template.interpolate({
                              id: option,
                              checked: checked,
                              label: _('device-' + option)
                            });
        self.devices.appendChild(item_li);
      });
      this.devices.addEventListener('click',
        this.optionClickhandler.bind(this));
      this.devices.classList.add('visible');
    },

    /**
     * Put the message in the dialog.
     * @memberof PermissionManager.prototype
     */
    showPermissionPrompt: function pm_showPermissionPrompt(
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

      var _ = navigator.mozL10n.get;
      this.yes.textContent =
        isSharedPermission ? _('share-' + this.permissionType) : _('allow');
      this.yesHandler = this.clickHandler.bind(this);
      this.yes.addEventListener('click', this.yesHandler);
      this.yes.callback = yescallback;

      this.no.textContent = isSharedPermission ?
          _('dontshare-' + this.permissionType) : _('dontallow');
      this.noHandler = this.clickHandler.bind(this);
      this.no.addEventListener('click', this.noHandler);
      this.no.callback = nocallback;

      // customize camera selector dialog
      if (this.isCamSelector) {
        this.message.classList.add('hidden');
        this.rememberSection.style.display = 'none';
        this.buttons.dataset.items = 1;
        this.no.style.display = 'none';
        this.yes.textContent = _('ok');
      }
      // Make the screen visible
      this.overlay.classList.add('visible');
    },

    /**
     * Cancels a request with a specfied id. Request can either be
     * currently showing, or pending. If there are further pending requests,
     * the next is shown.
     * @memberof PermissionManager.prototype
     */
    cancelRequest: function pm_cancelRequest(id) {
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
    },

    /**
     * Clean current request queue and
     * send refuse permission request message to gecko
     * @memberof PermissionManager.prototype
     */
    discardPermissionRequest: function pm_discardPermissionRequest() {
      if (this.currentRequestId === undefined ||
          this.currentRequestId === null) {
        return;
      }
      this.dispatchResponse(this.currentRequestId, 'permission-deny', false);
      this.hidePermissionPrompt();
      this.pending = [];
    }
  };

  exports.PermissionManager = PermissionManager;

})(window);
