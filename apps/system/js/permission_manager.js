/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PermissionManager = {

  // Div over in which the permission UI resides.
  overlay: document.getElementById('permission-screen'),
  dialog: document.getElementById('permission-dialog'),
  message: document.getElementById('permission-message'),
  moreInfo: document.getElementById('permission-more-info'),
  moreInfoLink: document.getElementById('permission-more-info-link'),
  moreInfoBox: document.getElementById('permission-more-info-box'),

  // "Yes"/"No" buttons on the permission UI.
  yes: document.getElementById('permission-yes'),
  no: document.getElementById('permission-no'),

  // Remember the choice checkbox
  remember: document.getElementById('permission-remember-checkbox'),
  rememberSection: document.getElementById('permission-remember-section'),

  currentOrigin: undefined,
  currentPermission: undefined,
  currentPermissions: undefined,
  currentOptions: {}, //origin options
  currentChoices: {}, //select choices
  init: function pm_init() {
    var self = this;

    window.addEventListener('mozChromeEvent',
      function pm_chromeEventHandler(evt) {
      var detail = evt.detail;
      switch (detail.type) {
        case 'permission-prompt':
          self.overlay.dataset.type = detail.permission;
          self.currentPermission = detail.permission;
          // not show remember my choice option in gUM
          if ('video-capture' === detail.permission ||
              'audio-capture' === detail.permission) {
            self.rememberSection.style.display = 'none';
            self.remember.checked = false;
          } else {
            self.rememberSection.style.display = 'block';
          }

          if (detail.options) {
            if ('video-capture' in detail.options ||
                'audio-capture' in detail.options) {
              // set default choice
              self.currentOptions = detail.options;
              self.currentChoices[detail.permission] =
                detail.options[detail.permission][0];
            }
            // handle getUserMedia multiple permissions request
            if (detail.permissions && detail.permissions.length > 1) {
              self.currentPermissions = detail.permissions;

              detail.permissions.forEach(function(permission) {
                // set default choices
                self.currentChoices[permission] = detail.options[permission][0];
              });

              if ('video-capture' in detail.options &&
                  'audio-capture' in detail.options) {
                self.overlay.dataset.type = 'media-capture';
                self.currentPermission = 'media-capture';
              }
            } else {
              self.currentPermissions = undefined;
            }
          }

          self.currentOrigin = detail.origin;
          self.handlePermissionPrompt(detail);
          break;
        case 'cancel-permission-prompt':
          self.discardPermissionRequest();
          break;
        case 'fullscreenoriginchange':
          delete self.overlay.dataset.type;
          self.handleFullscreenOriginChange(detail);
          break;
      }
    });

    this.rememberSection.addEventListener('click',
      function onLabelClick() {
      self.remember.checked = !self.remember.checked;
    });

    // On home/holdhome pressed, discard permission request.
    // XXX: We should make permission dialog be embededd in appWindow
    // Gaia bug is https://bugzilla.mozilla.org/show_bug.cgi?id=853711
    // Gecko bug is https://bugzilla.mozilla.org/show_bug.cgi?id=852013
    window.addEventListener('home', this.discardPermissionRequest.bind(this));
    window.addEventListener('holdhome',
      this.discardPermissionRequest.bind(this));
  },


  fullscreenRequest: undefined,

  handleFullscreenOriginChange:
    function pm_handleFullscreenOriginChange(detail) {
    // If there's already a fullscreen request visible, cancel it,
    // we'll show the request for the new domain.
    if (this.fullscreenRequest != undefined) {
      this.cancelRequest(this.fullscreenRequest);
      this.fullscreenRequest = undefined;
    }
    if (detail.fullscreenorigin != WindowManager.getDisplayedApp()) {
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

  handlePermissionPrompt: function pm_handlePermissionPrompt(detail) {
    this.remember.checked = detail.remember ? true : false;
    var str = '';
    var permissionID = 'perm-' + this.currentPermission.replace(':', '-');
    var _ = navigator.mozL10n.get;

    if (detail.isApp) { // App
      var app = Applications.getByManifestURL(detail.manifestURL);
      str = _(permissionID + '-appRequest',
        { 'app': new ManifestHelper(app.manifest).name });
    } else { // Web content
      str = _(permissionID + '-webRequest', { 'site': detail.origin });
    }

    var moreInfoText = _(permissionID + '-more-info');
    var self = this;
    this.requestPermission(detail.origin, this.currentPermission,
      str, moreInfoText,
      function pm_permYesCB() {
        self.dispatchResponse(detail.id, 'permission-allow',
          self.remember.checked);
      },
      function pm_permNoCB() {
        self.dispatchResponse(detail.id, 'permission-deny',
          self.remember.checked);
    });
  },

  responseStatus: undefined,
  dispatchResponse: function pm_dispatchResponse(id, type, remember) {
    remember = remember ? true : false;
    this.responseStatus = type;

    var response = {
      id: id,
      type: type,
      remember: remember
    };

    if (this.currentPermission === 'video-capture' ||
        this.currentPermission === 'audio-capture' ||
        this.currentPermission === 'media-capture') {
      response['choice'] = this.currentChoices;
    }
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, response);
    window.dispatchEvent(event);
  },

  // A queue of pending requests. Callers of requestPermission() must be
  // careful not to create an infinite loop!
  pending: [],

  // The ID of the next permission request. This is incremented by one
  // on every request, modulo some large number to prevent overflow problems.
  nextRequestID: 0,

  // The ID of the request currently visible on the screen. This has the value
  // "undefined" when there is no request visible on the screen.
  currentRequestId: undefined,

  hidePermissionPrompt: function pm_hidePermissionPrompt() {
    this.overlay.classList.remove('visible');
    this.currentRequestId = undefined;
    // Cleanup the event handlers.
    this.yes.removeEventListener('click',
      this.clickHandler.bind(this));
    this.yes.callback = null;
    this.no.removeEventListener('click',
      this.clickHandler.bind(this));
    this.no.callback = null;

    this.moreInfoLink.removeEventListener('click',
      this.clickHandler.bind(this));
    this.moreInfo.classList.add('hidden');
  },

  // Show the next request, if we have one.
  showNextPendingRequest: function pm_showNextPendingRequest() {
    if (this.pending.length == 0) {
      //clean current choices
      this.currentChoices = undefined;
      return;
    }
    var request = this.pending.shift();
    // bug 907075 Dismiss continuous same permission request but
    // dispatch mozContentEvent as well if remember is checked
    if (this.remember.checked) {
      if ((this.currentOrigin === request.origin) &&
        (this.currentPermission === request.permission)) {
        this.dispatchResponse(request.id, this.responseStatus,
          this.remember.checked);
        return;
      }
    }
    this.currentChoices = undefined;
    this.showPermissionPrompt(request.id,
                         request.message,
                         request.moreInfoText,
                         request.yescallback,
                         request.nocallback);
  },

  // This is the event listener function for the yes/no buttons.
  clickHandler: function pm_clickHandler(evt) {
    var callback = null;
    if (evt.target === this.yes && this.yes.callback) {
      callback = this.yes.callback;
    } else if (evt.target === this.no && this.no.callback) {
      callback = this.no.callback;
    } else if (evt.target === this.moreInfoLink) {
      this.moreInfoBox.classList.toggle('hidden');
      return;
    }
    this.hidePermissionPrompt();

    // Call the appropriate callback, if it is defined.
    if (callback)
      window.setTimeout(callback, 0);
    this.showNextPendingRequest();
  },

  requestPermission: function pm_requestPermission(origin, permission,
                                   msg, moreInfoText,
                                   yescallback, nocallback) {
    var id = this.nextRequestID;
    this.nextRequestID = (this.nextRequestID + 1) % 1000000;

    if (this.currentRequestId != undefined) {
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

  showPermissionPrompt: function pm_showPermissionPrompt(id, msg, moreInfoText,
                                      yescallback, nocallback) {
    // Put the message in the dialog.
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    this.message.textContent = msg;
    if (moreInfoText) {
      // Show the "More info… " link.
      this.moreInfo.classList.remove('hidden');
      this.moreInfoLink.addEventListener('click',
        this.clickHandler.bind(this));
      this.moreInfoBox.textContent = moreInfoText;
    }
    this.currentRequestId = id;
    // Make the screen visible
    this.overlay.classList.add('visible');

    // Set event listeners for the yes and no buttons
    var isSharedPermission = this.currentPermission === 'video-capture' ||
      this.currentPermission === 'audio-capture' ||
      this.currentPermission === 'media-capture' ||
      this.currentPermission === 'geolocation';

    var _ = navigator.mozL10n.get;

    this.yes.textContent =
      isSharedPermission ? _('share-' + this.currentPermission) : _('allow');
    this.yes.addEventListener('click', this.clickHandler.bind(this));
    this.yes.callback = yescallback;

    this.no.textContent =
      isSharedPermission ? _('dontshare-' + this.currentPermission) : _('deny');
    this.no.addEventListener('click', this.clickHandler.bind(this));
    this.no.callback = nocallback;
  },

  // Cancels a request with a specfied id. Request can either be
  // currently showing, or pending. If there are further pending requests,
  // the next is shown.
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

  discardPermissionRequest: function pm_discardPermissionRequest() {
    if (this.currentRequestId == undefined)
      return;
    this.dispatchResponse(this.currentRequestId, 'permission-deny', false);
    this.hidePermissionPrompt();
  }

};

PermissionManager.init();
