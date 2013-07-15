/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var OrientationObserver = {
  deviceOrientation: 'portrait-primary',
  init: function oo_init() {
    window.addEventListener('screenchange', this);
  },

  handleEvent: function oo_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        // We only observe device orientation when screen is on.
        if (evt.detail.screenEnabled) {
          window.addEventListener('deviceorientation', this);
        } else {
          window.removeEventListener('deviceorientation', this);
        }
        break;

      case 'deviceorientation':
        // Orientation is 0 starting at 'natural portrait' increasing
        // going clockwise
        this.deviceOrientation =
          (evt.beta < -45 && evt.beta > -135) ? 'portrait-primary' :
          (evt.beta > 45 && evt.beta < 135) ? 'portrait-secondary' :
          (evt.gamma < -45 && evt.gamma > -135) ? 'landscape-secondary' :
          (evt.gamma > 45 && evt.gamma < 135) ? 'landscape-primary' :
          this.deviceOrientation;
        break;
    }
  },

  // If an app doesn't designate orientation, or designates only "landscape"
  // or "portrait", select one for it by looking at current orientation.
  determine: function oo_determine(appOrientation) {
    var result;
    result = appOrientation || this.deviceOrientation;
    if (result == 'landscape' || result == 'portrait') {
      result = this.deviceOrientation.startsWith(result) ?
               this.deviceOrientation :
               result + '-primary';
    }
    return result;
  }
};

OrientationObserver.init();
