/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Video(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = Video;

/**
 * @const {string}
 */
Video.ORIGIN = 'app://video.gaiamobile.org';

/**
 * @const {Object}
 */
Video.Selector = Object.freeze({
  thumbnail: 'ul.thumbnail-group-container li',
  fullscreenView: '#fullscreen-view',
  infoView: '#info-view',
  thumbnailsSingleInfoButton: '#thumbnails-single-info-button'
});

Video.prototype = {
  /**
   * Marionette client to use.
   * @type {Marionette.Client}
   */
  client: null,

  /**
   * @return {Marionette.Element} First element of all thumbnail videos.
   */
  get thumbnail() {
    return this.client.findElement(Video.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} List of elements of thumbnail videos.
   */
  get thumbnails() {
    return this.client.findElements(Video.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} Container for fullscreen view of an video.
   */
  get fullscreenView() {
    return this.client.findElement(Video.Selector.fullscreenView);
  },

  /**
   * @return {Marionette.Element} Container for info view of an video.
   */
  get infoView() {
    return this.client.findElement(Video.Selector.infoView);
  },

  /**
   * @return {Marionette.Element} Element to click to view video info.
   */
  get thumbnailsSingleInfoButton() {
    return this.client.findElement(Video.Selector.thumbnailsSingleInfoButton);
  },

  /**
   * Start the Video, save the client for future ops, and wait for the
   * Video to finish an initial render.
   */
  launch: function() {
    this.client.apps.launch(Video.ORIGIN);
    this.client.apps.switchToApp(Video.ORIGIN);
    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');
    this.client.helper.waitForElement(Video.Selector.thumbnail);
  }
};
