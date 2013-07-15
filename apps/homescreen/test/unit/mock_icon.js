'use strict';

function MockTemplateIcon(bookmark) {
  this.descriptor = {};
  this.app = bookmark ? { iconable: true } : {};
}

function MockIcon(descriptor, app) {
  this.descriptor = descriptor;
  this.app = app;
}

MockIcon.prototype = MockTemplateIcon.prototype = {
  remove: function mi_remove() {
  },

  update: function mi_update() {
  },

  getWidth: function mi_getWidth() {
    return 16;
  },

  loadDefaultIcon: function mi_loadDefaultIcon() {
    if (this.app && this.app.iconable) {
      this.descriptor.renderedIcon = 'data:image/png;base64,iVBORw0KGgoA';
    } else {
      this.descriptor.renderedIcon = 'data:image/png;base64,jfhsadufhaeh';
    }
  },

  getUID: function mi_getUID() {
    return '1';
  },

  render: function mi_render() {
    var span = document.createElement('span');
    span.dataset.isIcon = true;
    span.style.width = span.style.height = '10px';
    return span;
  }
};

MockIcon.mDefaultIcon = 'http://inexistant.name/default_icon.png';

function MockgetDefaultIcon(app) {
  return MockIcon.mDefaultIcon;
}
