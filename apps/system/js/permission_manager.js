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
  devices: document.getElementById('permission-devices'),

  currentOrigin: undefined,
  currentPermission: undefined,
  currentPermissions: undefined,
  currentChoices: {}, //select choices
  isVideo: false,
  isAudio: false,
  init: function pm_init() {
    window.addEventListener('mozChromeEvent', this);

    var self = this;
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

  // Reset current values
  clean: function pm_clean() {
    this.currentPermission = undefined;
    this.currentPermissions = undefined;
    this.isVideo = false;
    this.isAudio = false;
    this.currentChoices = {};
    this.devices.innerHTML = '';
    if (!this.moreInfoBox.classList.contains('hidden')) {
      this.moreInfoBox.classList.add('hidden');
    }
  },

  handleEvent: function pm_chromeEventHandler(evt) {
    var detail = evt.detail;
    switch (detail.type) {
      case 'permission-prompt':
        this.clean();
        this.currentOrigin = detail.origin;

        if (detail.permissions) {
          if ('video-capture' in detail.permissions) {
            this.isVideo = true;

            LazyLoader.load('shared/js/template.js');
          }
          if ('audio-capture' in detail.permissions) {
            this.isAudio = true;
          }
        } else {
          // work in compatible mode
          if (detail.permission) {
            this.currentPermission = detail.permission;
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
          this.currentPermission = 'media-capture';
        } else {
          for (var permission in detail.permissions) {
            if (detail.permissions.hasOwnProperty(permission)) {
              this.currentPermission = permission;
            }
          }
        }
        this.overlay.dataset.type = this.currentPermission;

        // Not show remember my choice option in gUM
        if (this.isAudio || this.isVideo) {
          this.rememberSection.style.display = 'none';

          // Set default options
          this.currentPermissions = detail.permissions;
          for (var permission in detail.permissions) {
            if (detail.permissions.hasOwnProperty(permission)) {
              // gecko might not support audio/video option
              if (detail.permissions[permission].length > 0) {
                this.currentChoices[permission] =
                  detail.permissions[permission][0];
              }
            }
          }
        } else {
          this.rememberSection.style.display = 'block';
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
  },

  // Handle media options
  optionClickhandler: function pm_optionClickhandler(evt) {
    var link = evt.target;
    if (!link)
      return;
    if (link.classList.contains('input-enable')) {
      if (link.checked) {
        this.currentChoices['video-capture'] = link.id;
      }
      var currentChoiceId;
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
    if (this.isAudio || this.isVideo) {
      this.remember.checked = false;
    } else {
      this.remember.checked = detail.remember ? true : false;
    }
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

    if (this.isVideo || this.isAudio) {
      response['choices'] = this.currentChoices;
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
    this.moreInfo.classList.add('hidden');
  },

  // Show the next request, if we have one.
  showNextPendingRequest: function pm_showNextPendingRequest() {
    if (this.pending.length === 0) {
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

  // Form the media source selection list
  listDeviceOptions: function pm_listDeviceOptions() {
    var _ = navigator.mozL10n.get;
    var self = this;
    var template = new Template('device-list-item-tmpl');
    var checked;
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

  showPermissionPrompt: function pm_showPermissionPrompt(id, msg, moreInfoText,
                                      yescallback, nocallback) {
    // Put the message in the dialog.
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    this.message.textContent = msg;
    if (moreInfoText) {
      // Show the "More info… " link.
      this.moreInfo.classList.remove('hidden');
      this.moreInfoHandler = this.clickHandler.bind(this);
      this.moreInfoLink.addEventListener('click', this.moreInfoHandler);
      this.moreInfoBox.textContent = moreInfoText;
    }
    this.currentRequestId = id;

    // Hide the list if there's only 1 option
    if (this.isVideo && this.currentPermissions['video-capture'].length > 1) {
      this.listDeviceOptions();
    }

    // Make the screen visible
    this.overlay.classList.add('visible');

    // Set event listeners for the yes and no buttons
    var isSharedPermission = this.isVideo || this.isAudio ||
         this.currentPermission === 'geolocation';

    var _ = navigator.mozL10n.get;
    this.yes.textContent =
      isSharedPermission ? _('share-' + this.currentPermission) : _('allow');
    this.yesHandler = this.clickHandler.bind(this);
    this.yes.addEventListener('click', this.yesHandler);
    this.yes.callback = yescallback;

    this.no.textContent =
      isSharedPermission ? _('dontshare-' + this.currentPermission) : _('deny');
    this.noHandler = this.clickHandler.bind(this);
    this.no.addEventListener('click', this.noHandler);
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
