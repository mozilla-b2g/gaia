'use strict';

Evme.IconManager = new function Evme_IconManager() {
  var NAME = "IconManager",
      self = this,
      _prefix = "_icon",
      CACHE_VERSION = "2.6";

  this.add = function add(id, icon, iconsFormat) {
    if (!icon) {
      return false;
    }

    icon.format = iconsFormat;
    icon.id = id;

    if (!icon.format || !icon.revision || !icon.id) {
      return false;
    }

    self.get(id, function fromCache(iconFromCache) {
      if (!iconFromCache || iconFromCache.format < iconsFormat) {
        Evme.Storage.set(_prefix + id, icon);
        Evme.EventHandler.trigger(NAME, "iconAdded", icon);
      }
    });

    return true;
  };

  this.addIcons = function addIcons(icons, format) {
    for (var i = 0, icon; icon = icons[i++];) {
      this.add(icon.id, icon.icon, format);
    }
  };

  this.get = function get(id, callback) {
    Evme.Storage.get(_prefix + id, callback);
  };
};

Evme.IconGroup = new function Evme_IconGroup() {
  var ICON_HEIGHT,
      TEXT_HEIGHT,
      TEXT_MARGIN,
      WIDTH,
      HEIGHT;

  this.init = function init(options) {
    ICON_HEIGHT = 42 * Evme.Utils.devicePixelRatio,
    TEXT_HEIGHT = Evme.Utils.APPS_FONT_SIZE * 3,
    TEXT_MARGIN = 9 * Evme.Utils.devicePixelRatio,
    WIDTH = 72 * Evme.Utils.devicePixelRatio,
    HEIGHT = ICON_HEIGHT + TEXT_MARGIN + TEXT_HEIGHT;
  };

  this.get = function get(icons, callback) {
    var el;

    callback = callback || Evme.Utils.NOOP;

    if (icons && icons.length){
      el = renderCanvas({
        "icons": icons,
        "settings": Evme.Utils.getIconGroup(icons.length),
        "onReady": callback
      });
    }

    else {
      el = renderEmptyIcon({
        "onReady": callback
      });
    }

    return el;
  };

  /**
   * Draw icon for Collection with no apps.
   */
   function renderEmptyIcon(options){
    var icon = Evme.Utils.getEmptyCollectionIcon(),
        onReady = options.onReady,
        elCanvas = document.createElement('canvas'),
        context = elCanvas.getContext('2d'),
        img = new Image();

    elCanvas.width = WIDTH;
    elCanvas.height = WIDTH;

    img.onload = function onload(){
      // TODO: Ask @evyatron why does passing 60,60 renders too small?
      context.drawImage(img, 0, 0, 72, 72);
      onReady(elCanvas);
    }

    img.src = Evme.Utils.formatImageData(icon);

    return elCanvas;
  }

  function renderCanvas(options) {
    var icons = options.icons,
        settings = options.settings,
        onReady = options.onReady,
        elCanvas = document.createElement('canvas'),
        context = elCanvas.getContext('2d');

    // can't render more icons than we have settings for
    icons = icons.slice(0, settings.length);

    elCanvas.width = WIDTH;
    elCanvas.height = WIDTH;
    context.imagesToLoad = icons.length;
    context.imagesLoaded = [];

    for (var i = 0; i < icons.length; i++) {
      // render the icons from bottom to top
      var icon = icons[icons.length - 1 - i];

      loadIcon(icon, settings[(settings.length - icons.length) + i], context, i, onReady);
    }

    return elCanvas;
  }

  function loadIcon(iconSrc, settings, context, index, onReady) {
    if (!iconSrc) {
      onIconLoaded(context, null, settings, index, onReady);
      return false;
    }

    var image = new Image();

    image.onload = function onImageLoad() {
      var elImageCanvas = document.createElement('canvas'),
          imageContext = elImageCanvas.getContext('2d'),
          fixedImage = new Image(),
          size = settings.size * Evme.Utils.devicePixelRatio;

      elImageCanvas.width = elImageCanvas.height = size;

      //first we draw the image resized and clipped (to be rounded)
      imageContext.drawImage(this, 0, 0, size, size);

      // dark overlay
      if (settings.darken) {
        imageContext.fillStyle = 'rgba(0, 0, 0, ' + settings.darken + ')';
        imageContext.beginPath();
        imageContext.arc(size / 2, size / 2, Math.ceil(size / 2), 0, Math.PI * 2, false);
        imageContext.fill();
        imageContext.closePath();
      }

      fixedImage.onload = function onImageLoad() {
        onIconLoaded(context, this, settings, index, onReady);
      };

      fixedImage.src = elImageCanvas.toDataURL('image/png');
    };

    if (Evme.Utils.isBlob(iconSrc)) {
      Evme.Utils.blobToDataURI(iconSrc, function onDataReady(src) {
        image.src = src;
      });
    } else {
      image.src = Evme.Utils.formatImageData(iconSrc);
    }

    return true;
  }

  function onIconLoaded(context, image, settings, index, onAllIconsReady) {
    // once the image is ready to be drawn, we add it to an array
    // so when all the images are loaded we can draw them in the right order
    context.imagesLoaded.push({
      "image": image,
      "settings": settings,
      "index": index
    });

    if (context.imagesLoaded.length === context.imagesToLoad) {
      // all the images were loaded- let's sort correctly before drawing
      context.imagesLoaded.sort(function(a, b) {
        return a.index > b.index ? 1 : a.index < b.index ? -1 : 0;
      });

      // finally we're ready to draw the icons!
      for (var i = 0, obj; obj = context.imagesLoaded[i++];) {
        image = obj.image;
        settings = obj.settings;

        var size = settings.size * Evme.Utils.devicePixelRatio;

        if (!image) {
          continue;
        }

        // shadow
        context.shadowOffsetX = settings.shadowOffset;
        context.shadowOffsetY = settings.shadowOffset;
        context.shadowBlur = settings.shadowBlur;
        context.shadowColor = 'rgba(0, 0, 0, ' + settings.shadowOpacity + ')';

        // rotation
        context.save();
        context.translate(settings.x * Evme.Utils.devicePixelRatio + size / 2, settings.y * Evme.Utils.devicePixelRatio + size / 2);
        context.rotate((settings.rotate || 0) * Math.PI / 180);
        // draw the icon already!
        context.drawImage(image, -size / 2, -size / 2);
        context.restore();
      }

      onAllIconsReady && onAllIconsReady(context.canvas);
    }
  }
};