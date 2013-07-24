function TemplateIcon(isBookmark) {
  var descriptor = {
    name: 'templateIcon',
    hidden: true,
    renderedIcon: null
  };

  var app = {};
  if (isBookmark) {
    app.iconable = true;
  }

  AppIcon.call(this, descriptor, app);
}

TemplateIcon.prototype = {
  __proto__: AppIcon.prototype,
  loadDefaultIcon: function ticon_loadDefaultIcon() {
    var image = new Image();
    var self = this;
    image.src = getDefaultIcon(self.app);
    image.onload = function icon_defaultIconLoadSucess() {
      image.onload = null;
      self.renderImage(image);
    };
  },
  renderBlob: function ticon_renderBlob(blob) {
    this.descriptor.renderedIcon = blob;
  }
};
