/* jshint -W098 */
define(function(require) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:preview-gallery');
var addPanAndZoomHandlers = require('lib/panzoom');
var orientation = require('lib/orientation');
var MediaFrame = require('MediaFrame');
var bind = require('lib/bind');
var attach = require('attach');
var View = require('view');

/**
 * `<gaia-header>` used in template
 */

require('gaia-header');

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

  initialize: function(options) {
    this.rtl = options.rtl;
    debug('initialized');
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.frameContainer = this.find('.js-frame-container');
    this.els.previewMenu = this.find('.js-preview-menu');
    this.els.mediaFrame = this.find('.js-media-frame');
    this.els.countText = this.find('.js-count-text');
    this.els.options = this.find('.js-options');
    this.els.header = this.find('.js-header');
    this.els.share = this.find('.js-share');

    // We're appending new elements to DOM so to make sure headers are
    // properly resized and centered, we emmit a lazyload event.
    // This will be removed when the gaia-header web component lands.
    window.dispatchEvent(new CustomEvent('lazyload', {
      detail: this.el
    }));

    // Configure the MediaFrame component
    this.configure();

    // Clean up
    delete this.template;

    debug('rendered');
    return this.bindEvents();
  },

  bindEvents: function() {
    bind(this.el, 'tap', this.onTap);
    bind(this.els.header, 'action', this.firer('click:back'));
    bind(this.els.options, 'click', this.onButtonClick);
    bind(this.els.share, 'click', this.onButtonClick);
    // The standard accessible control for sliders is arrow up/down keys.
    // Our screenreader synthesizes those events on swipe up/down gestures.
    bind(this.els.mediaFrame, 'wheel', this.onFrameWheel);
    return this;
  },

  configure: function() {
    this.currentIndex = this.lastIndex = 0;

    this.frame = new MediaFrame(this.els.mediaFrame, true, this.maxPreviewSize);
    this.frame.video.onloading = this.onVideoLoading;
    this.frame.video.onplaying = this.onVideoPlaying;
    this.frame.video.onpaused = this.onVideoPaused;

    addPanAndZoomHandlers(this.frame, this.swipeCallback);
  },

  template: function() {
    return '<div class="preview-menu js-preview-menu">' +
        '<gaia-header class="js-header" action="back">' +
          '<h1 data-l10n-id="preview">Preview</h1>' +
          '<button class="preview-share-icon js-share"' +
            'name="share" data-icon="share" ' +
            'data-l10n-id="share-button"></button>' +
          '<button class="preview-option-icon ' +
            'js-options" name="options" data-icon="more" ' +
            'data-l10n-id="more-button"></button>' +
        '</gaia-header>' +
      '</div>' +
      '<div class="frame-container js-frame-container">' +
        '<div class="media-frame js-media-frame"></div>' +
      '</div>' +
      '<div class="count-text js-count-text"></div>';
  },

  onTap: function() {
    if (this.videoPlaying) {
      return;
    }

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

  onFrameWheel: function(event) {
    if (event.deltaMode !== event.DOM_DELTA_PAGE || event.deltaY) {
      return;
    }
    if (event.deltaX > 0) {
      this.emit('swipe', 'left');
    } else if (event.deltaX < 0) {
      this.emit('swipe', 'right');
    }
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
        this.withinRightBound() &&                    // has previous item and
        (swipeAmount > SWIPE_DISTANCE_THRESHOLD ||  // distance big enough or
         swipeVelocity > SWIPE_VELOCITY_THRESHOLD)) // speed fast enough
    {
      direction = 'right';
      translation = '100%';
    }
    // Should we move to the next item?
    else if (swipeAmount <= 0 && swipeVelocity <= 0 &&
             this.withinLeftBound() &&
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
      this.onVideoPaused();
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
    if (this.videoPlaying) { return; }

    el = el || e.currentTarget;
    var name = el.getAttribute('name');
    if (this.optionsMenuContainer) {
      this.hideOptionsMenu();
    }
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

    // Ensure that the information about the number of thumbnails is provided to
    // the screen reader.
    this.els.mediaFrame.setAttribute('data-l10n-id', 'media-frame');
    this.els.mediaFrame.setAttribute('data-l10n-args', JSON.stringify(
      { total: total, current: current }));
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

  onVideoLoading: function() {
    this.emit('loadingvideo', 'loadingVideo');
  },

  onVideoPlaying: function() {
    if (this.videoPlaying) {
      return;
    }

    this.videoPlaying = true;
    this.previewMenuFadeOut();

    this.emit('playingvideo');
  },

  onVideoPaused: function() {
    if (!this.videoPlaying) {
      return;
    }

    this.videoPlaying = false;
    this.previewMenuFadeIn();
  },

  showOptionsMenu: function() {
    this.optionsMenuContainer = document.createElement('div');
    this.optionsMenuContainer.innerHTML = this.optionTemplate();
    this.el.appendChild(this.optionsMenuContainer);

    this.el.classList.add('action-menu');

    this.menu = this.find('.js-menu');

    // We add the event listner for menu items and cancel buttons
    var cancelButton = this.find('.js-cancel');
    bind(cancelButton, 'click', this.hideOptionsMenu);
    if (this.menu) {
      attach.on(this.menu, 'click', '.js-btn', this.onButtonClick);
    }
  },

  hideOptionsMenu: function() {
    if (this.optionsMenuContainer) {
      this.el.classList.remove('action-menu');
      this.optionsMenuContainer.parentElement.removeChild(
        this.optionsMenuContainer);
      this.optionsMenuContainer = null;
    }
  },

  withinRightBound: function() {
    if (this.rtl) {
      return this.currentIndex < this.lastIndex;
    }
    return this.currentIndex > 1;
  },

  withinLeftBound: function() {
    if (this.rtl) {
      return this.currentIndex > 1;
    }
    return this.currentIndex < this.lastIndex;
  },

  optionTemplate: function() {
    return '<form class="visible" data-type="action"' +
      'role="dialog" data-z-index-level="action-menu">' +
      '<header data-l10n-id="options">Options</header>' +
      '<menu class="js-menu">' +
      '<button class="js-btn" name="gallery" data-l10n-id="open-gallery">' +
        'Open Gallery' +
      '</button>' +
      '<button class="js-btn" name="delete" data-l10n-id="delete">' +
        'Delete' +
      '</button>' +
      '<button class="js-cancel" data-action="cancel" data-l10n-id="cancel">' +
        'Cancel' +
      '</button>' +
      '</menu>' +
      '</form>';
  }
});

});
