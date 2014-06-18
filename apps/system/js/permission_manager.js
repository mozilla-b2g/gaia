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
    ELEMENT_PREFIX: 'permission-',
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
    currentRequestId: undefined
  };

  PermissionManager.prototype._fetchElements = function pm_fetchElements() {
    this.element = document.getElementById('permission-screen');
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementClasses = ['title', 'message',
      'more-info', 'more-info-link', 'hide-info-link', 'more-info-box',
      'remember-section', 'remember', 'device-title', 'devices',
      'buttons', 'yes', 'no'];

    // Loop and add element with camel style name to Modal Dialog attribute.
    this.elementClasses.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
    }.bind(this));
  };

  /**
   * start the PermissionManager to init variables and listeners
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.start = function pm_start() {
    this._fetchElements();

    this.onRememberSectionClick = this.onRememberSectionClick.bind(this);
    this.elements.rememberSection.addEventListener('click',
      this.onRememberSectionClick);

    window.addEventListener('mozChromeEvent', this);
    /* On home/holdhome pressed, discard permission request.
     * XXX: We should make permission dialog be embededd in appWindow
     * Gaia bug is https://bugzilla.mozilla.org/show_bug.cgi?id=853711
     * Gecko bug is https://bugzilla.mozilla.org/show_bug.cgi?id=852013
     */
    this.discardPermissionRequest = this.discardPermissionRequest.bind(this);
    window.addEventListener('home', this.discardPermissionRequest);
    window.addEventListener('holdhome', this.discardPermissionRequest);
  };

  PermissionManager.prototype.onRememberSectionClick =
    function pm_onLabelClick() {
    this.remember.checked = !this.remember.checked;
  };

  /**
   * stop the PermissionManager to reset variables and listeners
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.stop = function pm_stop() {
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

    this.element = null;
    this.elements.title = null;
    this.elements.message = null;
    this.elements.moreInfo = null;
    this.elements.moreInfoLink = null;
    this.elements.moreInfoBox = null;

    this.elements.remember = null;
    this.elements.rememberSection.removeEventListener('click',
      this.onRememberSectionClick);
    this.elements.deviceTitle = null;
    this.elements.devices = null;

    this.elements.buttons = null;
    this.elements.yes = null;
    this.elements.no = null;

    window.removeEventListener('mozChromeEvent', this);
    window.removeEventListener('home', this);
    window.removeEventListener('holdhome', this);
  };

  /**
   * Reset current values
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.cleanDialog = function pm_cleanDialog() {
    this.permissionType = undefined;
    this.currentPermissions = undefined;
    this.currentChoices = {};
    this.isVideo = false;
    this.isAudio = false;
    this.isCamSelector = false;

    //handled in showPermissionPrompt
    if (this.elements.message.classList.contains('hidden')) {
      this.elements.message.classList.remove('hidden');
    }
    if (!this.elements.moreInfoBox.classList.contains('hidden')) {
      this.elements.moreInfoBox.classList.add('hidden');
    }
    this.elements.devices.innerHTML = '';
    if (!this.elements.deviceTitle.classList.contains('hidden')) {
      this.elements.deviceTitle.classList.add('hidden');
    }
    this.elements.buttons.dataset.items = 2;
    this.elements.no.style.display = 'inline';
  };

  /**
   * Event handler interface for mozChromeEvent.
   * @memberof PermissionManager.prototype
   * @param {DOMEvent} evt The event.
   */
  PermissionManager.prototype.handleEvent = function pm_handleEvent(evt) {
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
        this.element.dataset.type = this.permissionType;

        if (this.isAudio || this.isVideo) {
          if (!detail.isApp) {
            // Not show remember my choice option in website
            this.elements.rememberSection.style.display = 'none';
          } else {
            this.elements.rememberSection.style.display = 'block';
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
        delete this.element.dataset.type;
        this.handleFullscreenOriginChange(detail);
        break;
    }
  };

  /**
   * Handle getUserMedia device select options
   * @memberof PermissionManager.prototype
   * @param {DOMEvent} evt The event.
   */
  PermissionManager.prototype.optionClickhandler =
    function pm_optionClickhandler(evt) {
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
  PermissionManager.prototype.handleFullscreenOriginChange =
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
  };

  /**
   * Prepare for permission prompt
   * @memberof PermissionManager.prototype
   * @param {Object} detail The event detail object.
   */
  PermissionManager.prototype.handlePermissionPrompt =
    function pm_handlePermissionPrompt(detail) {
    if ((this.isAudio || this.isVideo) && !detail.isApp &&
      !this.isCamSelector) {
      // gUM always not remember in web mode
      this.elements.remember.checked = false;
    } else {
      this.elements.remember.checked = detail.remember ? true : false;
    }

    var message = '';
    var permissionID = 'perm-' + this.permissionType.replace(':', '-');
    var _ = navigator.mozL10n.get;

    if (detail.isApp) { // App
      var app = applications.getByManifestURL(detail.manifestURL);
      message = _(permissionID + '-appRequest',
        { 'app': new ManifestHelper(app.manifest).name });

      this.elements.title.innerHTML = _('title-app');
      if (this.isCamSelector) {
        this.elements.title.innerHTML = _('title-cam');
      }
      this.elements.deviceTitle.innerHTML = _('perm-camera-selector-appRequest',
          { 'app': new ManifestHelper(app.manifest).name });
    } else { // Web content
      message = _(permissionID + '-webRequest', { 'site': detail.origin });

      this.elements.title.innerHTML = _('title-web');
      this.elements.deviceTitle.innerHTML = _('perm-camera-selector-webRequest',
          { 'site': detail.origin });
    }

    var moreInfoText = _(permissionID + '-more-info');
    var self = this;
    this.requestPermission(detail.origin, this.permissionType,
      message, moreInfoText,
      function pm_permYesCB() {
        self.dispatchResponse(detail.id, 'permission-allow',
          self.elements.remember.checked);
      },
      function pm_permNoCB() {
        self.dispatchResponse(detail.id, 'permission-deny',
          self.elements.remember.checked);
    });
  };

  /**
   * Send permission choice to gecko
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.dispatchResponse =
    function pm_dispatchResponse(id, type, remember) {
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
  PermissionManager.prototype.hidePermissionPrompt =
    function pm_hidePermissionPrompt() {
    this.element.classList.remove('visible');
    this.elements.devices.removeEventListener('click', this);
    this.elements.devices.classList.remove('visible');
    this.currentRequestId = undefined;
    // Cleanup the event handlers.
    this.elements.yes.removeEventListener('click', this.yesHandler);
    this.elements.yes.callback = null;
    this.elements.no.removeEventListener('click', this.noHandler);
    this.elements.no.callback = null;
    this.elements.moreInfoLink.removeEventListener('click',
      this.moreInfoHandler);
    this.elements.hideInfoLink.removeEventListener('click',
      this.moreInfoHandler);
    this.elements.moreInfo.classList.add('hidden');
    // XXX: This is telling AppWindowManager to focus the active app.
    // After we are moving into AppWindow, we need to remove that
    // and call this.app.focus() instead.
    this.publish('permissiondialoghide');
  };

  PermissionManager.prototype.publish = function(eventName, detail) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(eventName, true, true, detail);
    window.dispatchEvent(event);
  };

  /**
   * Show the next request, if we have one.
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.showNextPendingRequest =
    function pm_showNextPendingRequest() {
    if (this.pending.length === 0) {
      return;
    }
    var request = this.pending.shift();
    // bug 907075 Dismiss continuous same permission request but
    // dispatch mozContentEvent as well if remember is checked
    if (this.elements.remember.checked) {
      if ((this.currentOrigin === request.origin) &&
        (this.permissionType === request.permission)) {
        this.dispatchResponse(request.id, this.responseStatus,
          this.elements.remember.checked);
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
  PermissionManager.prototype.clickHandler = function pm_clickHandler(evt) {
    var callback = null;
    if (evt.target === this.elements.yes && this.elements.yes.callback) {
      callback = this.elements.yes.callback;
    } else if (evt.target === this.elements.no && this.elements.no.callback) {
      callback = this.elements.no.callback;
    } else if (evt.target === this.elements.moreInfoLink ||
               evt.target === this.elements.hideInfoLink) {
      this.toggleInfo();
      return;
    }
    this.hidePermissionPrompt();

    // Call the appropriate callback, if it is defined.
    if (callback) {
      window.setTimeout(callback, 0);
    }
    this.showNextPendingRequest();
  };

  PermissionManager.prototype.toggleInfo = function pm_toggleInfo() {
    this.elements.moreInfoLink.classList.toggle('hidden');
    this.elements.hideInfoLink.classList.toggle('hidden');
    this.elements.moreInfoBox.classList.toggle('hidden');
  };

  /**
   * Queue or show the permission prompt
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.requestPermission =
    function pm_requestPermission(origin, permission,
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
  };

  /**
   * Form the media source selection list
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.listDeviceOptions =
    function pm_listDeviceOptions() {
    var _ = navigator.mozL10n.get;
    var self = this;
    var template = new Template('device-list-item-tmpl');
    var checked;

    // show description
    this.elements.deviceTitle.classList.remove('hidden');
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
      self.elements.devices.appendChild(item_li);
    });
    this.elements.devices.addEventListener('click',
      this.optionClickhandler.bind(this));
    this.elements.devices.classList.add('visible');
  };

  /**
   * Put the message in the dialog.
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.showPermissionPrompt =
    function pm_showPermissionPrompt(
        id, msg, moreInfoText, yescallback, nocallback) {
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    this.elements.message.textContent = msg;
    if (moreInfoText) {
      // Show the "More info… " link.
      this.elements.moreInfo.classList.remove('hidden');
      this.moreInfoHandler = this.clickHandler.bind(this);
      this.hideInfoHandler = this.clickHandler.bind(this);
      this.elements.moreInfoLink.addEventListener('click',
        this.moreInfoHandler);
      this.elements.hideInfoLink.addEventListener('click',
        this.hideInfoHandler);
      this.elements.moreInfoBox.textContent = moreInfoText;
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
    this.elements.yes.textContent =
      isSharedPermission ? _('share-' + this.permissionType) : _('allow');
    this.yesHandler = this.clickHandler.bind(this);
    this.elements.yes.addEventListener('click', this.yesHandler);
    this.elements.yes.callback = yescallback;

    this.elements.no.textContent = isSharedPermission ?
        _('dontshare-' + this.permissionType) : _('dontallow');
    this.noHandler = this.clickHandler.bind(this);
    this.elements.no.addEventListener('click', this.noHandler);
    this.elements.no.callback = nocallback;

    // customize camera selector dialog
    if (this.isCamSelector) {
      this.elements.message.classList.add('hidden');
      this.elements.rememberSection.style.display = 'none';
      this.elements.buttons.dataset.items = 1;
      this.elements.no.style.display = 'none';
      this.elements.yes.textContent = _('ok');
    }
    // Make the screen visible
    this.element.classList.add('visible');
  };

  /**
   * Cancels a request with a specfied id. Request can either be
   * currently showing, or pending. If there are further pending requests,
   * the next is shown.
   * @memberof PermissionManager.prototype
   */
  PermissionManager.prototype.cancelRequest = function pm_cancelRequest(id) {
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
  PermissionManager.prototype.discardPermissionRequest =
    function pm_discardPermissionRequest() {
    if (this.currentRequestId === undefined ||
        this.currentRequestId === null) {
      return;
    }
    this.dispatchResponse(this.currentRequestId, 'permission-deny', false);
    this.hidePermissionPrompt();
    this.pending = [];
  };

  exports.PermissionManager = PermissionManager;

})(window);
