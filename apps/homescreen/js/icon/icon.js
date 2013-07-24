/*
 * Base Icon constructor
 *
 * @param {Object} descriptor
 *                 An object that contains the data necessary to draw this
 *                 icon.
 * @param {Application} app [optional]
 *                      The Application or Bookmark object corresponding to
 *                      this icon.
 */
function Icon(descriptor, app) {
  this.descriptor = descriptor;
}

Icon.prototype = {

  /**
   * It returns an unique identifier among all icons installed on the homescreen
   */
  getUID: function icon_getUID() {
    var descriptor = this.descriptor;

    return (descriptor.manifestURL || descriptor.bookmarkURL) +
           (descriptor.entry_point ? descriptor.entry_point : '');
  },

  isOfflineReady: function icon_isOfflineReady() {
    return !(this.descriptor.isHosted &&
      !this.descriptor.hasOfflineCache ||
      this.descriptor.isBookmark);
  },

  /*
   * Renders the icon into the page
   *
   * @param{Object} where the icon should be rendered
   *
   * @param{Object} where the draggable element should be appended
   */
  render: function icon_render(target) {
    /*
     * <li role="button" aria-label="label" class="icon" data-manifestURL="zzz">
     *   <div>
     *     <img role="presentation" src="the icon image path"></img>
     *     <span class="label">label</span>
     *   </div>
     *   <span class="options"></span>
     * </li>
     */

    var container = this.container = document.createElement('li');
    this.container.dataset.offlineReady = this.isOfflineReady();
    container.className = 'icon';
    if (this.descriptor.hidden) {
      delete this.descriptor.hidden;
      container.dataset.visible = false;
    }

    var descriptor = this.descriptor;
    container.dataset.isIcon = true;
    this._descriptorIdentifiers.forEach(function(prop) {
      var value = descriptor[prop];
      if (value)
        container.dataset[prop] = value;
    });

    var localizedName = descriptor.localizedName || descriptor.name;
    container.setAttribute('role', 'button');
    container.setAttribute('aria-label', localizedName);

    // Icon container
    var icon = this.icon = document.createElement('div');

    // Image
    var img = this.img = new Image();
    img.setAttribute('role', 'presentation');
    img.width = MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS;
    img.height = MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS;
    img.style.visibility = 'hidden';
    if (descriptor.renderedIcon) {
      this.displayRenderedIcon();
    } else {
      this.fetchImageData();
    }
    icon.appendChild(img);

    // Label

    // wrapper of the label -> overflow text should be centered
    // in draggable mode
    var wrapper = document.createElement('span');
    wrapper.className = 'labelWrapper';
    var label = this.label = document.createElement('span');
    label.textContent = localizedName;
    wrapper.appendChild(label);
    this.applyOverflowTextMask();

    icon.appendChild(wrapper);

    container.appendChild(icon);

    if (descriptor.removable === true) {
      this.appendOptions();
    }

    target.appendChild(container);

    if (this.downloading) {
      //XXX: Bug 816043 We need to force the repaint to show the span
      // with the label and the animation (associated to the span)
      container.style.visibility = 'visible';
      icon.classList.add('loading');
    }
  },

  applyOverflowTextMask: function icon_applyOverflowTextMask() {
    var label = this.label;
    if (TextOverflowDetective.check(label.textContent)) {
      label.parentNode.classList.add('mask');
    } else {
      label.parentNode.classList.remove('mask');
    }
  }
};
