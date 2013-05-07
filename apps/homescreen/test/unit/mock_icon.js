'use strict';

function MockIcon(descriptor, app) {
  this.descriptor = descriptor;
  this.app = app;
}

MockIcon.prototype = {
  remove: function mi_remove() {
  },

  update: function mi_update() {
  },

  getWidth: function mi_getWidth() {
    return 16;
  }
};

MockIcon.mDefaultIcon = 'http://inexistant.name/default_icon.png';

function MockgetDefaultIcon(app) {
  return MockIcon.mDefaultIcon;
}

