/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {

  /**
   * Manage the alternative camera in the LockScreen.
   *
   * @constructor AltCameraManager
   */
  var AltCameraManager = function() {
    this.initEvents();
    this.initElements();
  };
  AltCameraManager.prototype = {
    elements: {
      altCamera: null,
      altCameraButton: null
    },
    configs: {
      elementsIDs: {
        altCamera: 'lockscreen-alt-camera',
        altCameraButton: 'lockscreen-alt-camera-button'
      },
      listens: [
        'click'
      ]
    }
  };

  /**
   * @listens 'click' - if user clicked on the alternative camera button,
   *                    the camera should be launched in a secure window.
   * @this {AltCameraManager}
   * @memberof AltCameraManager
   */
  AltCameraManager.prototype.handleEvent = function(evt) {
    console.dir(evt);
    if ('click' === evt.type && this.elements.altCameraButton === evt.target) {
      this.launch();
    }
  };

  /**
   * @private
   * @this {AltCameraManager}
   * @memberof AltCameraManager
   */
  AltCameraManager.prototype.initElements = function() {
    for (var id in this.configs.elementIDs) {
      this.elements[id] = document.getElementById(id);
      if (!this.elements[id]) {
        throw new Error('Can\'t initialize the element:' + id);
      }
    }
  };

  /**
   * @private
   * @this {AltCameraManager}
   * @memberof AltCameraManager
   */
  AltCameraManager.prototype.initEvents = function() {
    this.configs.listens.forEach(function(ename) {
      self.addEventListener(ename, this);
    });
  };

  /**
   * @private
   * @this {AltCameraManager}
   * @memberof AltCameraManager
   */
  AltCameraManager.prototype.suspendEvents = function() {
    this.configs.listens.forEach(function(ename) {
      self.removeEventListener(ename, this);
    });
  };

  /**
   * @private
   * @this {AltCameraManager}
   * @memberof AltCameraManager
   */
  AltCameraManager.prototype.launch = function() {
    // XXX hardcode URLs
    // Proper fix should be done in bug 951978 and friends.
    var cameraAppUrl =
          self.location.href.replace('system', 'camera'),
        cameraAppManifestURL =
          cameraAppUrl.replace(/(\/)*(index.html)*$/, '/manifest.webapp')
                      .replace(/$/, '#secure');
    self.secureWindowFactory.create(cameraAppUrl, cameraAppManifestURL);
  };
  exports.AltCameraManager = AltCameraManager;
})(self);
