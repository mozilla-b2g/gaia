/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Video(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

/**
 * @const {string}
 */

Video.ORIGIN = 'app://video.gaiamobile.org';

module.exports = Video;

/**
 * @const {Object}
 */
Video.Selector = Object.freeze({
  thumbnail: 'li.thumbnail',
  fullscreenView: '#fullscreen-view',
  infoView: '#info-view',
  thumbnailsSingleInfoButton: '#thumbnails-single-info-button',
  videoControls: '#videoControls',
  overlay: '#overlay',
  thumbnailsSelectButton: '#thumbnails-select-button',
  thumbnailSelectView: '#thumbnail-select-view',
  thumbnailsShareButton: '#thumbnails-share-button',
  thumbnailsVideoButton: '#thumbnails-video-button',
  thumbnailsDeleteButton: '#thumbnails-delete-button'
});

Video.prototype = {
  /**
   * Marionette client to use
   * @type {Marionette.Client}
   */
  client: null,

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
   * @return {Marionette.Element} overlay that displays message load videos
   * to get started.
   */
  get overlay() {
    return this.client.findElement(Video.Selector.overlay);
  },

  /**
   * @return {Marionette.Element} that displays video controls.
   */
  get videoControls() {
    return this.client.findElement(Video.Selector.videoControls);
  },

  /**
   * @return {Marionette.Element} List of elements of thumbnail videos.
   */
  getThumbnails: function() {
   return this.client.findElements(Video.Selector.thumbnail);
  },

  enterSelectionMode: function() {
    this.client.findElement(Video.Selector.thumbnailsSelectButton).click();
    this.client.helper.waitForElement(Video.Selector.thumbnailSelectView);
  },

   /**
   * Clicks first element of all thumbnail videos
   * @return {Marionette.Element} First element of all thumbnail videos.
   */
  clickThumbnail: function(idx) {
    var firstItem = this.getThumbnails()[idx];
    firstItem.click();
    return firstItem;
  },

  /**
   * Clicks share button to share videos in selection mode
   */
  clickShare: function() {
    this.client.findElement(Video.Selector.thumbnailsShareButton).click();
  },

  /**
   * Clicks camera button to open camera view
   */
  clickCamera: function() {
    this.client.findElement(Video.Selector.thumbnailsVideoButton).click();
  },

  /**
   * Clicks delete button to delete videos in selection mode
   */
  clickMultipleDelete: function() {
    this.client.findElement(Video.Selector.thumbnailsDeleteButton).click();
  },

  /**
   * Clicks OK button in confirm dialog to delete files
   */
  clickOkToDelete: function() {
    // selector specific to the out-of-app confirm dialog
    // found in system/index.html
    this.client.findElement('#modal-dialog-confirm-ok').click();
  },

  /**
   * Clicks info button to view info about the playing current video
   */
  clickInfoButton: function() {
    this.client.findElement(Video.Selector.thumbnailsSingleInfoButton).click();
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
  }
};
