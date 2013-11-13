'use strict';

Evme.IconManager = new function Evme_IconManager() {
  var NAME = 'IconManager',
      self = this,
      _prefix = '_icon',
      timeoutUpdateStorage,
      // this will save an object with all the cached icons' data
      savedIconsKeys = {},
      _iconsKey = 'savedIconsKeys',
      CACHE_VERSION = '2.6';

  this.init = function init() {
    Evme.Storage.get(_iconsKey, function fromCache(value) {
      savedIconsKeys = value || {};
    });
  };

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
      if (!iconFromCache ||
            iconFromCache.format < iconsFormat ||
            iconFromCache.revision < icon.revision) {
        Evme.Storage.set(_prefix + id, icon);
        addToGlobalKey(icon);
        Evme.EventHandler.trigger(NAME, 'iconAdded', icon);
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

  this.getKeys = function getKeys() {
    return savedIconsKeys;
  };

  function addToGlobalKey(icon) {
    window.clearTimeout(timeoutUpdateStorage);

    savedIconsKeys[icon.id] = {
      id: icon.id,
      format: icon.format,
      revision: icon.revision
    };

    // used to not "bomb" the storage with inserts
    timeoutUpdateStorage = window.setTimeout(function updateStorage() {
      Evme.Storage.set(_iconsKey, savedIconsKeys);
    }, 100);
  }
}

Evme.IconGroup = new function Evme_IconGroup() {
  var SIZE,
      SCALE_RATIO;

  this.init = function init(options) {
    SCALE_RATIO = window.devicePixelRatio || 1;
    SIZE = Evme.Utils.getOSIconSize() * SCALE_RATIO;
  };

  this.get = function get(icons, callback) {
    var el,
      validIcons = [];

    callback = callback || Evme.Utils.NOOP;

    // only include valid icons (not nulls or undefineds)
    for (var i = 0; i < icons.length; i++) {
      if (icons[i]) {
        validIcons.push(icons[i]);
      }
    }


    if (validIcons.length) {
      el = renderCanvas({
        'icons': validIcons,
        'onReady': callback
      });
    }

    else {
      el = renderEmptyIcon({
        'onReady': callback
      });
    }

    return el;
  };

  function getCanvas() {
    var elCanvas = document.createElement('canvas');

    elCanvas.width = SIZE;
    elCanvas.height = SIZE;

    return elCanvas;
  }

  /**
   * Draw icon for Collection with no apps.
   */
   function renderEmptyIcon(options) {
    var onReady = options.onReady,
        elCanvas = getCanvas();

    onReady(elCanvas);

    return elCanvas;
  }

  function renderCanvas(options) {
    var icons = options.icons,
        numberOfIcons = 0,
        settings = null,
        onReady = options.onReady,
        elCanvas = getCanvas(),
        context = elCanvas.getContext('2d');

    settings = Evme.Utils.getIconGroup(icons.length);

    // can't render more icons than we have settings for
    icons = icons.slice(0, settings.length);
    numberOfIcons = icons.length;

    context.imagesToLoad = numberOfIcons;
    context.imagesLoaded = [];

    for (var i = 0; i < numberOfIcons; i++) {
      // render the icons from bottom to top
      var icon = icons[numberOfIcons - 1 - i];

      if (icon) {
        var iconSettings = settings[(settings.length - numberOfIcons) + i];
        loadIcon(icon, iconSettings, context, i, onReady);
      }
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
          size = Math.round(settings.size * SIZE);

      elImageCanvas.width = elImageCanvas.height = size;

      //first we draw the image resized and clipped (to be rounded)
      imageContext.drawImage(this, 0, 0, size, size);

      // dark overlay
      if (settings.darken) {
        imageContext.fillStyle = 'rgba(0, 0, 0, ' + settings.darken + ')';
        imageContext.beginPath();
        imageContext.arc(size / 2, size / 2, Math.ceil(size / 2), 0,
                                                          Math.PI * 2, false);
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
      'image': image,
      'settings': settings,
      'index': index
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

        if (!image) {
          continue;
        }

        var size = image.width,
            shadowBounds = (settings.shadowOffsetX || 0);

        // shadow
        context.shadowOffsetX = settings.shadowOffsetX || 0;
        context.shadowOffsetY = settings.shadowOffsetY || 0;
        context.shadowBlur = settings.shadowBlur;
        context.shadowColor = 'rgba(0, 0, 0, ' + settings.shadowOpacity + ')';

        var x = parse(settings.x, size),
            y = parse(settings.y, size);

        // rotation
        if (settings.rotate) {
          context.save();
          context.translate(x + size / 2, y + size / 2);
          context.rotate((settings.rotate || 0) * Math.PI / 180);
          context.drawImage(image, -size / 2, -size / 2);
          context.restore();
        } else {
          context.drawImage(image, x, y);
        }
      }

      onAllIconsReady && onAllIconsReady(context.canvas);
    }

    // parses a size from the config
    // can be something like "center", "center+4" or just "4"
    function parse(value, size) {
      var newValue = value,
          match = value.toString().match(/(center|left|right)(\+|\-)?(\d+)?/);

      if (match) {
        var pos = match[1],
            op = match[2],
            mod = (parseInt(match[3]) || 0) * SCALE_RATIO;

        switch (pos) {
          case 'center': newValue = (SIZE - size) / 2; break;
          case 'left': newValue = 0; break;
          case 'right': newValue = SIZE - size - shadowBounds; break;
        }

        switch (op) {
          case '+': newValue += mod; break;
          case '-': newValue -= mod; break;
        }
      } else {
        // if the value is a plain integer - need to adjust for pixel ratio
        newValue *= SCALE_RATIO;
      }

      return parseInt(newValue) || 0;
    }
  }
}
