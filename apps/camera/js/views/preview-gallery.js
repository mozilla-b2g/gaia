define(function(require) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:preview-gallery');
var bind = require('lib/bind');
var attach = require('vendor/attach');
var View = require('vendor/view');
var orientation = require('lib/orientation');
var addPanAndZoomHandlers = require('lib/panzoom');
var MediaFrame = require('MediaFrame');

/**
 * Constants
 */
var SWIPE_DISTANCE_THRESHOLD = window.innerWidth / 3; // pixels
var SWIPE_VELOCITY_THRESHOLD = 1.0;                   // pixels/ms

var SWIPE_DURATION = 250;   // How long to animate the swipe
var FADE_IN_DURATION = 500; // How long to animate the fade in after swipe


/**
 * Locals
 */

return View.extend({
  name: 'preview-gallery',
  className: 'offscreen',

  initialize: function() {
    debug('rendered');
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.previewControl = this.find('.js-preview');
    this.els.frameContainer = this.find('.js-frame-container');
    this.els.mediaFrame = this.find('.js-media-frame');
    this.els.countText = this.find('.js-count-text');
    this.els.previewMenu = this.find('.js-preview-menu');

    bind(this.el, 'click', this.onClick);
    attach.on(this.els.previewMenu, 'click', '.js-btn', this.onButtonClick);

    this.configure();
    return this;
  },

  configure: function() {
    this.frame = new MediaFrame(this.els.mediaFrame);

    this.els.player = this.find('.videoPlayer');
    this.els.playerPlayBtn = this.find('.videoPlayerPlayButton');

    // To hanlde player events in the preview not video_player.js.
    // Use 'click' event instead of 'play'
    // because 'click' event fires ealer than 'play'
    bind(this.els.playerPlayBtn, 'click', this.handleVideoPlay);
    bind(this.els.player, 'pause', this.handleVideoStop);
    bind(this.els.player, 'ended', this.handleVideoStop);

    this.currentIndex = this.lastIndex = 0;
    addPanAndZoomHandlers(this.frame, this.swipeCallback);
  },

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="frame-container js-frame-container">' +
      '<div class="media-frame js-media-frame"></div>' +
      '</div>' +
      '<div class="preview-menu js-preview-menu">' +
        '<div class="camera-back icon-camera-back js-btn" name="back"></div>' +
        '<div class="count-text js-count-text"></div>' +
        '<footer class="preview-controls js-preview">' +
          '<div class="preview-gallery-button js-btn" name="gallery">' +
            '<div class="preview-gallery-icon icon-gallery"></div>' +
          '</div>' +
          '<div class="preview-share-button js-btn" name="share">' +
            '<div class="preview-share-icon icon-preview-share"></div>' +
          '</div>' +
          '<div class="preview-delete-button js-btn" name="delete">' +
            '<div class="preview-delete-icon icon-preview-delete"></div>' +
          '</div>' +
        '</footer>' +
      '</div>';
  },

  onClick: function() {
    if (this.videoPlaying) { return; }

    var isShown = this.els.previewMenu.classList.contains('visible');
    if (isShown) {
      this.previewMenuFadeOut();
    } else {
      this.previewMenuFadeIn();
    }
  },

  previewMenuFadeIn: function() {
    this.els.previewMenu.classList.add('visible');
  },

  previewMenuFadeOut: function() {
    this.els.previewMenu.classList.remove('visible');
  },

  swipeCallback: function(swipeAmount, swipeVelocity) {
    var self = this;

    if (swipeVelocity === undefined) {
      // If this is not the end of the gesture, then just move the media
      // frame left or right by the specified amount.
      this.els.frameContainer.style.transform =
        'translate(' + swipeAmount + 'px, 0)';
      return;
    }

    // If we were passed a velocity, then this is the end of the gesture
    // and we have to figure out whether we are going to go to the
    // next item, the previous item, or remain on the current item.
    var direction, translation;

    // Should we move to the previous item?
    if (swipeAmount > 0 && swipeVelocity > 0 &&     // Same sign and
        this.currentIndex > 1 &&                    // has previous item and
        (swipeAmount > SWIPE_DISTANCE_THRESHOLD ||  // distance big enough or
         swipeVelocity > SWIPE_VELOCITY_THRESHOLD)) // speed fast enough
    {
      direction = 'right';
      translation = '100%';
    }
    // Should we move to the next item?
    else if (swipeAmount <= 0 && swipeVelocity <= 0 &&
             this.currentIndex < this.lastIndex &&
             (swipeAmount < -SWIPE_DISTANCE_THRESHOLD ||
              swipeVelocity < -SWIPE_VELOCITY_THRESHOLD)) {
      direction = 'left';
      translation = '-100%';
    }

    // If we're not moving either left or right, just animate the
    // item to its starting point and we're done.
    if (!direction) {
      animate('transform', 'translate(0,0)', SWIPE_DURATION);
      return;
    }

    // If we get here, we are going to slide the current item off the screen
    // and display the next or previous item.

    // First, stop the video if there is one and it is playing.
    if (this.videoPlaying) {
      this.handleVideoStop();
    }

    // Now animate the item off the screen
    animate('transform', 'translate(' + translation + ', 0)',
            SWIPE_DURATION,
            function() {
              // Once we're off screen ask the controller to
              // switch to the new image.
              self.emit('swipe', direction);

              // On the next redraw, put the frame back on the screen
              // but make it opaque
              window.requestAnimationFrame(function() {
                // Next, make the frame invisible
                // and put it back on the screen
                self.els.frameContainer.style.opacity = 0;
                self.els.frameContainer.style.transform = 'translate(0,0)';

                // Then on the frame after that, animate the opacity to
                // make it visible again.
                window.requestAnimationFrame(function() {
                  animate('opacity', 1, FADE_IN_DURATION);
                });
              });
            });

    // A helper function to animate the specified CSS property to the
    // specified value for the specified duration. When the animation
    // is complete, reset everything and call the done callback
    function animate(property, value, duration, done) {
      var e = self.els.frameContainer;
      e.addEventListener('transitionend', onTransitionEnd);
      e.style.transitionProperty = property;
      e.style.transitionDuration = duration + 'ms';
      e.style[property] = value;

      function onTransitionEnd() {
        e.removeEventListener('transitionend', onTransitionEnd);
        delete e.style.transitionProperty;
        delete e.style.transitionDuration;
        if (done) {
          done();
        }
      }
    }
  },

  onButtonClick: function(e, el) {
    var name = el.getAttribute('name');
    this.emit('click:' + name, e);
    e.stopPropagation();
  },

  open: function() {
    window.addEventListener('resize', this.onResize);
    orientation.unlock();
    this.previewMenuFadeIn();
    this.el.classList.remove('offscreen');
  },

  close: function() {
    window.removeEventListener('resize', this.onResize);
    orientation.lock();
    this.previewMenuFadeOut();
    this.el.classList.add('offscreen');
    this.frame.clear();
  },

  updateCountText: function(current, total) {
    this.currentIndex = current;
    this.lastIndex = total;
    this.els.countText.textContent = current + '/' + total;
  },

  onResize: function() {
    // And we have to resize the frame (and its video player)
    this.frame.resize();
    if (this.frame.displayingVideo) {
      this.frame.video.setPlayerSize();
    }
  },

  showImage: function(image) {
    this.frame.displayImage(
      image.blob,
      image.width,
      image.height,
      image.preview,
      image.rotation,
      image.mirrored);
  },

  showVideo: function(video) {
    this.frame.displayVideo(
      video.blob,
      video.poster.blob,
      video.width,
      video.height,
      video.rotation);
  },

  handleVideoPlay: function(e) {
    this.videoPlaying = true;
    this.previewMenuFadeOut();
    e.stopPropagation();
  },

  handleVideoStop: function() {
    this.videoPlaying = false;
    setTimeout(this.previewMenuFadeIn, 300);
  }
});

});
