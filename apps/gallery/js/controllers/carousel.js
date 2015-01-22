/*global MozActivity, LazyLoader, NFC, Spinner*/
/*global setView, share, photodb, videostorage, getVideoFile, getCurrentFile*/
/*global cropResizeRotate, ensureFileBackedBlob, editPhotoIfCardNotFull*/
/*global CONFIG_MAX_IMAGE_PIXEL_SIZE*/
/*global CONFIG_MAX_PICK_PIXEL_SIZE*/
/*global LAYOUT_MODE*/
/*exported CarouselController*/
/*jshint esnext:true*/
'use strict';

var CarouselController = (function() {

/**
 * Initialize a new `CarouselController` for a
 * <gallery-carousel-view> element.
 *
 * @param {GalleryCarouselView} view
 */
function CarouselController(view) {
  this.view = view;

  this.view.addEventListener('action', (evt) => {
    if (this.disabled) {
      return;
    }

    var action = this['_' + evt.detail + 'Handler'];
    if (typeof action === 'function') {
      action.call(this, evt);
    }
  });

  this.view.addEventListener('changed', (evt) => {
    this.itemIndex = evt.detail.newItemIndex;
    window.currentFileIndex = this.itemIndex;
  });
}

CarouselController.prototype.constructor = CarouselController;

/**
 * Disables the 'action' event handlers for this
 * controller's view.
 *
 * @public
 */
CarouselController.prototype.disable = function() {
  this.disabled = true;
};

/**
 * Enables the 'action' event handlers for this
 * controller's view.
 *
 * @public
 */
CarouselController.prototype.enable = function() {
  this.disabled = false;
};

/**
 * Sets the collection of items used to populate
 * this controller's view.
 *
 * @param {Array} items
 *
 * @public
 */
CarouselController.prototype.setItems = function(items) {
  this.items = items;
  this.view.setItems(items);
};

/**
 * Sets the index for specifying the current item
 * to display in this controller's view.
 *
 * @param {Number} itemIndex
 *
 * @public
 */
CarouselController.prototype.setItemIndex = function(itemIndex) {
  this.itemIndex = itemIndex;
  window.currentFileIndex = itemIndex;
  this.view.setItemIndex(itemIndex);
};

/**
 * Gets the current item being displayed in this
 * controller's view.
 *
 * @public
 */
CarouselController.prototype.getCurrentItem = function() {
  return this.items && this.items[this.itemIndex];
};

/**
 * Event handler for this controller's 'back' action.
 *
 * @private
 */
CarouselController.prototype._backHandler =  function() {
  setView(LAYOUT_MODE.list);
};

/**
 * Event handler for this controller's 'camera' action.
 *
 * @private
 */
CarouselController.prototype._cameraHandler = function() {
  if (this.cameraActivity) {
    return;
  }

  this.cameraActivity = new MozActivity({
    name: 'record',
    data: {
      type: 'photos'
    }
  });

  setTimeout(() => {
    this.cameraActivity = null;
  }, 2000);
};

/**
 * Event handler for this controller's 'edit' action.
 *
 * @private
 */
CarouselController.prototype._editHandler = function() {
  var currentItemIndex = this.itemIndex;
  LazyLoader.load([
    'js/ImageEditor.js',
    'shared/js/media/crop_resize_rotate.js'
  ], () => {
    editPhotoIfCardNotFull(currentItemIndex);
  });
};

/**
 * Event handler for this controller's 'share' action.
 *
 * @private
 */
CarouselController.prototype._shareHandler = function() {
  var currentItem = this.getCurrentItem();
  
  // If the item is a video, just share it
  if (currentItem.metadata.video) {
    getVideoFile(currentItem.metadata.video, (videoBlob) => {
      share([videoBlob]);
    });
    return;
  }

  // Otherwise it is an image.
  photodb.getFile(currentItem.name, (imageBlob) => {
    // If it does not have any EXIF orientation, and if we don't need
    // to downsample it, then just share it as it is.
    if (!currentItem.metadata.rotation &&
        !currentItem.metadata.mirrored &&
        !CONFIG_MAX_PICK_PIXEL_SIZE) {
      share([imageBlob]);
    }
    else {
      // This is only tricky case. If we are sharing an image that uses
      // EXIF orientation for correct display, rotate it before sharing
      // so that the recieving app doesn't have to know about EXIF
      LazyLoader.load(['shared/js/media/crop_resize_rotate.js'],
                      shareModifiedImage);
    }

    function shareModifiedImage() {
      Spinner.show();

      var metadata = currentItem.metadata;
      var maxsize = CONFIG_MAX_PICK_PIXEL_SIZE || CONFIG_MAX_IMAGE_PIXEL_SIZE;
      cropResizeRotate(imageBlob, null, maxsize || null, null, metadata,
                       (error, rotatedBlob) => {
                         if (error) {
                           console.error('Error while rotating image: ', error);
                           rotatedBlob = imageBlob;
                         }
                         ensureFileBackedBlob(rotatedBlob, (file) => {
                           Spinner.hide();
                           share([file], imageBlob.name);
                         });
                       });
    }
  });
};

/**
 * Event handler for this controller's 'info' action.
 *
 * @private
 */
CarouselController.prototype._infoHandler = function() {
  var currentItem = this.getCurrentItem();

  LazyLoader.load([
    'js/components/gallery-info-dialog.js',
    'shared/style/confirm.css'
  ], () => {
    var infoDialog = document.createElement('gallery-info-dialog');
    infoDialog.setItem(currentItem);
    infoDialog.addEventListener('action', (evt) => {
      document.body.removeChild(infoDialog);
    });

    document.body.appendChild(infoDialog);
  });
};

/**
 * Event handler for this controller's 'delete' action.
 *
 * @private
 */
CarouselController.prototype._deleteHandler = function() {
  var currentItem = this.getCurrentItem();
  var message = navigator.mozL10n.get(
    currentItem.metadata.video ? 'delete-video?' : 'delete-photo?'
  );

  var deleteItem = function() {
    var items = this.items;
    var itemIndex = this.itemIndex;

    items.splice(itemIndex, 1);

    this.setItems(items);
    this.setItemIndex(clamp(0, items.length - 1, itemIndex - 1));
    this.view.refresh();

    // Delete the file from the MediaDB. This removes the db entry and
    // deletes the file in device storage. This will generate an change
    // event which will call imageDeleted()
    photodb.deleteFile(currentItem.name);

    // If it is a video, however, we can't just delete the poster image, but
    // must also delete the video file.
    if (currentItem.metadata.video) {
      videostorage.delete(currentItem.metadata.video);
    }

    // If the metdata parser saved a preview image for this photo,
    // delete that, too.
    if (currentItem.metadata.preview &&
        currentItem.metadata.preview.filename) {
      // We use raw device storage here instead of MediaDB because that is
      // what MetadataParser.js uses for saving the preview.
      var pictures = navigator.getDeviceStorage('pictures');
      pictures.delete(currentItem.metadata.preview.filename);
    }
  }.bind(this);

  LazyLoader.load([
    'js/components/gallery-delete-dialog.js',
    'shared/style/confirm.css'
  ], () => {
    var deleteDialog = document.createElement('gallery-delete-dialog');
    deleteDialog.setMessage(message);
    deleteDialog.addEventListener('action', (evt) => {
      if (evt.detail === 'delete') {
        deleteItem();
      }

      // Enable NFC sharing when done deleting and returns to carousel view
      NFC.share(getCurrentFile);

      document.body.removeChild(deleteDialog);
    });

    document.body.appendChild(deleteDialog);
  });
};

/**
 * Constrains a numeric `value` to be within
 * range of the specified `min` and `max`.
 *
 * @param {Number} min
 * @param {Number} max
 * @param {Number} value
 *
 * @private
 */
function clamp(min, max, value) {
  return Math.min(Math.max(min, value), max);
}

return CarouselController;

})();
