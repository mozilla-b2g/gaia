function FolderIcon(result) {

  this._descriptorIdentifiers = ['query', 'name'];

  this.imageSrc = result.icon;

  this.descriptor = {
      name: result.title.substring(0, 12),
      query: result.query,
      renderedIcon: true
  };

  if (result.uri) {
    this.descriptor.uri = result.uri;
    this._descriptorIdentifiers.push('uri');
  }

  if (result.type) {
    this.descriptor.type = result.type;
    this._descriptorIdentifiers.push('type');
  }

  this.app = {};
}

FolderIcon.prototype = {

  __proto__: Icon.prototype,

  isOfflineReady: function() {
    return false;
  },

  displayRenderedIcon: function() {
    this.img.src = this.imageSrc;
    this.img.style.visibility = 'visible';
  }
};
