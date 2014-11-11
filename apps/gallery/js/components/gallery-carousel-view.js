/*global GestureDetector, MediaFrame, photodb, getVideoFile*/
/*global CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH*/
/*global CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT*/
/*exported GalleryCarouselView*/
/*jshint esnext:true*/
'use strict';

var GalleryCarouselView = (function() {

/**
 * Template for this component.
 *
 * @type {Object}
 */
var template =
`<style scoped>
  gaia-header {
    position: relative;
    z-index: 2;
  }
  gaia-carousel {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1
  }
  footer > .button {
    display: block;
    float: left;
    width: 20%;
  }
  gaia-header,
  footer {
    opacity: 1;
    transition: opacity 200ms linear;
  }
  .full-screen > gaia-header,
  .full-screen > footer {
    opacity: 0;
    pointer-events: none;
  }
</style>
<gaia-header action="back">
  <h1>0/0</h1>
</gaia-header>
<gaia-carousel item-padding="10"></gaia-carousel>
<footer>
  <a class="button" data-icon="camera" data-action="camera"></a>
  <a class="button" data-icon="edit-image" data-action="edit"></a>
  <a class="button" data-icon="share" data-action="share"></a>
  <a class="button" data-icon="info" data-action="info"></a>
  <a class="button" data-icon="delete" data-action="delete"></a>
</footer>`;

/**
 * Adds pan and zoom handlers to a MediaFrame object.
 *
 * @private
 */
function addPanAndZoomHandlers(frame, swipeCallback) {
  // frame is the MediaFrame object. container is its DOM element.
  var container = frame.container;

  // Generate gesture events for the container
  var gestureDetector = new GestureDetector(container);
  gestureDetector.startDetecting();

  // When the user touches the screen and moves their finger left or
  // right, they might want to pan within a zoomed-in image, or they
  // might want to swipe between multiple items in the camera preview
  // gallery. We pass the amount of motion to the MediaFrame pan() method,
  // and it returns the amount that cannot be used to pan the displayed
  // item. We track this returned amount as how far left or right the
  // image has been swiped, and pass the number to the swipeCallback.
  var swipeAmount = 0;

  // And handle them with these listeners
  container.addEventListener('dbltap', handleDoubleTap);
  container.addEventListener('transform', handleTransform);
  container.addEventListener('pan', handlePan);
  if (swipeCallback) {
    container.addEventListener('swipe', handleSwipe);
  }

  function handleDoubleTap(e) {
    var scale;
    if (frame.fit.scale > frame.fit.baseScale) {
      scale = frame.fit.baseScale / frame.fit.scale;
    }
    else {
      scale = 2;
    }

    frame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
  }

  function handleTransform(e) {
    frame.zoom(e.detail.relative.scale,
               e.detail.midpoint.clientX, e.detail.midpoint.clientY);
  }

  function handlePan(e) {
    var dx = e.detail.relative.dx;
    var dy = e.detail.relative.dy;

    if (swipeCallback) {
      dx += swipeAmount;
      swipeAmount = frame.pan(dx, dy);
      swipeCallback(swipeAmount);
    } else {
      frame.pan(dx, dy);
    }
  }

  function handleSwipe(e) {
    if (swipeAmount !== 0) {
      swipeCallback(swipeAmount, e.detail.vx);
      swipeAmount = 0;
    }
  }
}

/**
 * Updates the <h1> in the <gaia-header> to
 * reflect the current item number and total.
 *
 * @private
 */
function updateHeader(view) {
  var h1 = view.header.querySelector('h1');
  var totalItems = view._items.length;
  if (totalItems > 0) {
    h1.textContent = (view.carousel.itemIndex + 1) + '/' + totalItems;
  } else {
    h1.textContent = '';
  }
}

/**
 * Prototype extends from from `HTMLElement.prototype`.
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

/**
 * Sets the collection of items used to populate
 * this view.
 *
 * @param {Array} items
 *
 * @public
 */
proto.setItems = function(items) {
  this._items = items;
  this.carousel.itemCount = items.length;
  updateHeader(this);
};

/**
 * Sets the index for specifying the current item
 * to display in this view.
 *
 * @param {Number} itemIndex
 *
 * @public
 */
proto.setItemIndex = function(itemIndex) {
  this.carousel.itemIndex = itemIndex;
  updateHeader(this);
};

/**
 * Forces the <gaia-carousel> in this view to redraw
 * its items.
 *
 * @public
 */
proto.refresh = function() {
  this.carousel.refresh();
};

/**
 * Called when an instance of this element is created.
 *
 * @private
 */
proto.createdCallback = function() {
  this.innerHTML = template;

  this.header = this.querySelector('gaia-header');
  this.carousel = this.querySelector('gaia-carousel');
  this.footer = this.querySelector('footer');

  var mediaFrames = [];

  this.addEventListener('click', (evt) => {
    var action = evt.target.getAttribute('data-action');
    if (action) {
      this.dispatchEvent(new CustomEvent('action', {
        detail: action
      }));
    }
  });

  this.header.addEventListener('action', (evt) => {
    this.dispatchEvent(new CustomEvent('action', {
      detail: 'back'
    }));
  });

  var dbltapTimeout = null;

  this.carousel.addEventListener('click', (evt) => {
    if (dbltapTimeout) {
      clearTimeout(dbltapTimeout);
      dbltapTimeout = null;
      return;
    }

    dbltapTimeout = setTimeout(() => {
      if (this.classList.contains('full-screen')) {
        this.classList.remove('full-screen');
      } else {
        this.classList.add('full-screen');
      }

      dbltapTimeout = null;
    }, GestureDetector.DOUBLE_TAP_TIME + 50);
  });

  // The carousel fires this event for the previous, current and next
  // items that are about to be shown. An element reference is passed
  // in so that we can attach our content accordingly.
  this.carousel.addEventListener('willrenderitem', (evt) => {
    var carousel = this.carousel;
    var element = evt.detail.element;

    var mediaFrame;

    // Lazily create a reusable MediaFrame <div> container.
    var container = element.frameContainer;
    if (!container) {
      // Since the carousel recycles its content elements, we can use
      // them to hold a reference for our MediaFrame <div> container
      // for reuse later.
      container = element.frameContainer = document.createElement('div');
      container.addEventListener('touchstart', (evt) => {
        carousel.disabled = carousel.disabled || evt.touches.length > 1;
      });

      mediaFrame = container.mediaFrame = new MediaFrame(container, true);
      mediaFrame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
                                       CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);

      addPanAndZoomHandlers(mediaFrame, (overpan) => {
        carousel.disabled = !overpan;
      });

      mediaFrames.push(mediaFrame);
    } else {
      mediaFrame = container.mediaFrame;
    }

    // Re-attach the MediaFrame <div> container to the carousel's
    // content element.
    element.appendChild(container);

    // Get our content to display at the specified index.
    var item = this._items[evt.detail.index];

    // Clear the MediaFrame if there's no item to show at this index.
    if (!item) {
      mediaFrame.clear();
      return;
    }

    // Retrieve the photo or video poster image from storage.
    photodb.getFile(item.name, (imageBlob) => {
      var metadata = item.metadata;

      // If this is a video, then the file we just got is the poster image
      // and we still have to fetch the actual video
      if (metadata.video) {
        getVideoFile(metadata.video, (videoBlob) => {
          mediaFrame.displayVideo(videoBlob,
                                  imageBlob,
                                  metadata.width,
                                  metadata.height,
                                  metadata.rotation || 0);
        });
      }

      // Otherwise, just display the image
      else {
        mediaFrame.displayImage(imageBlob,
                                metadata.width,
                                metadata.height,
                                metadata.preview,
                                metadata.rotation,
                                metadata.mirrored);
      }
    });
  });

  // When the carousel resets its items internally, we have an
  // opportunity to reset the MediaFrame for the now-offscreen
  // item. So, if the user goes back to that item, it will no
  // longer have any zoom applied to it.
  this.carousel.addEventListener('willresetitem', (evt) => {
    var element = evt.detail.element;
    var mediaFrame = element.frameContainer &&
                     element.frameContainer.mediaFrame;
    if (mediaFrame) {
      mediaFrame.reset();
    }
  });

  this.carousel.addEventListener('changed', (evt) => {
    updateHeader(this);
    this.dispatchEvent(new CustomEvent('changed', {
      detail: evt.detail
    }));
  });

  // Reset all (3) MediaFrames when the window changes size
  // (orientation changes) so their contents appear to fit
  // properly again.
  window.addEventListener('resize', (evt) => {
    mediaFrames.forEach(function(mediaFrame) {
      mediaFrame.reset();
    });
  });
};

var GalleryCarouselView = document.registerElement('gallery-carousel-view', {
  prototype: proto
});

// Export the constructor and expose the `prototype` (Bug 1048339).
GalleryCarouselView._prototype = proto;
return GalleryCarouselView;

})();
