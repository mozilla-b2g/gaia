/* globals Evme, Promise, Icon */

(function() {
  'use strict';

  var

  scale = window.devicePixelRatio,
  size = Icon.prototype.MAX_ICON_SIZE * scale,

  height = size,
  width = size,
  center = size / 2,

  // diameter of center app icon
  dMain = 22 * scale,

  // diameter of side app icons
  dSide = 14 * scale,

  // darkness of to side icons
  sideIconDarken = 0.65,

  // app icons centering
  vOffset = 13 * scale,
  hOffset = 21 * scale,

  xMain = center - dMain / 2,
  yMain = height - (vOffset + dMain/2),

  xLeft = center - hOffset - dSide / 2,
  xRight = center + hOffset - dSide / 2,
  ySide = height - (vOffset + dSide/2),

  // gradient stops: top to bottom
  gradStops = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'],

  defaultBgFill = 'rgba(51, 51, 51, 0.85)',
  deafultBgImage = '/everything.me/images/collection_icon_default.png',

  // utils
  emelog = Evme.Utils.log,
  isBlob = Evme.Utils.isBlob,
  blobToDataURI = Evme.Utils.blobToDataURI;

  function CollectionIcon(config) {

    config = config || {};

    var

    canvas = document.createElement('canvas'),
    context = canvas.getContext('2d');

    canvas.height = height;
    canvas.width = width;

    // everything we draw will be cropped inside the rounded icon
    context.arc(center, center, center, 0, 2 * Math.PI);
    context.clip();
    context.save();

    this.canvas = canvas;
    this.context = context;

    // iconSrcs: array of base64 or blob image sources
    this.iconSrcs = config.iconSrcs || [];

    // bgSrc: base64 image
    this.bgSrc = config.bgSrc || null;

  }

  CollectionIcon.prototype.render = function render() {
    var self = this;

    var p = new Promise(function done(resolve, reject) {
      self.drawBg()
      .then(self.drawAppIcons.bind(self))
      .then(function resolved(){
        resolve(self.canvas);
      }, function rejected(reason) {
        // render method should always resolve
        // if we got here it means there was an exception
        self.context.restore();
        self.context.clearRect(0, 0, width, height);
        self.drawDefaultBg().then(function resolved() {
          resolve(self.canvas);
        });
      }).catch(function _catch(e) {
        emelog(e);
      });
    });

    return p;
  };

  CollectionIcon.prototype.drawAppIcons = function drawAppIcons() {
    var self = this;

    var p = new Promise(function done(resolve) {
      var iconPromises = [
        self.createAppIcon(self.iconSrcs[0]),
        self.createAppIcon(self.iconSrcs[1], sideIconDarken),
        self.createAppIcon(self.iconSrcs[2], sideIconDarken)
      ];

      window.Promise.all(iconPromises).then(function appIconsReady(canvases) {
          var
          center = canvases[0],
          right = canvases[1],
          left = canvases[2];


          if (left) {
            self.context.drawImage(left, xLeft, ySide, dSide, dSide);
          }

          if (right) {
            self.context.drawImage(right, xRight, ySide, dSide, dSide);
          }

          if (center) {
            self.context.drawImage(center, xMain, yMain, dMain, dMain);
          }

          resolve();
        }).catch(function _catch(e) {
          emelog(e);
        });
    });

    return p;
  };

  // renders src (base64 or blob) into new canvas, add dark overlay if required
  // return the canvas
  CollectionIcon.prototype.createAppIcon =
                                        function createAppIcon(src, darkness) {
    var p = new Promise(function done(resolve){
      if (src) {
        var img = new Image();

        img.onload = function _onload() {
          var imgCanvas = document.createElement('canvas'),
              ctx = imgCanvas.getContext('2d'),
              imgWidth = img.width,
              imgHeight = img.height;

          imgCanvas.width = imgWidth;
          imgCanvas.height = imgHeight;

          ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

          if (darkness) {
            darken(imgCanvas, ctx, darkness);
          }

          resolve(imgCanvas);
        };

        img.onerror = function _onerror() {
          resolve(null);
        };

        if (isBlob(src)) {
          blobToDataURI(src, function ready(dataURI) {
            img.src = dataURI;
          });
        } else {
          img.src = src;
        }


      } else {
        resolve(null);
      }
    });

    return p;
  };

  CollectionIcon.prototype.drawBg = function drawBg() {
    var self = this;

    var p = new Promise(function done(resolve) {
      if (self.bgSrc) {
        var img = new Image();

        img.onload = function _onload() {
          var
          ratio = Math.max(width/this.width, height/this.height),

          w = ratio * this.width,
          h = ratio * this.height,

          wOffset = width - w,
          hOffset = height - h;

          self.context.drawImage(img, wOffset / 2 , hOffset / 2, w, h);

          self.drawGrad();
          resolve();
        };

        img.onerror = function _onerror() {
          self.drawDefaultBg().then(resolve);
        };

        img.src = self.bgSrc;
      }

      else {
        self.drawDefaultBg().then(resolve);
      }
    });

    return p;
  };

  CollectionIcon.prototype.drawDefaultBg = function drawDefaultBg() {
    var self = this;

    return new Promise(function handler(resolve) {
      self.context.fillStyle = defaultBgFill;
      self.context.fillRect(0, 0, width, height);
      var img = new Image();

      img.onload = function onload() {
        self.context.drawImage(img, 0, 0, width, height);
        resolve();
      };

      img.onerror = resolve;

      img.src = deafultBgImage;

    });
  };

  CollectionIcon.prototype.drawGrad = function drawGrad() {
    var grad = this.context.createLinearGradient(center, 0, center, height);

    for (var i = 0, l = gradStops.length; i < l; i++) {
      grad.addColorStop(i, gradStops[i]);
    }

    this.context.fillStyle = grad;
    this.context.fillRect(0, 0, width, height);
  };

  function darken(canvas, context, darkness) {
    var
    pixels = context.getImageData(0, 0, canvas.width, canvas.height),
    data = pixels.data,
    l = data.length;

    for (var i = 0; i < l; i+=4) {
      data[i] *= darkness;
      data[i+1] *= darkness;
      data[i+2] *= darkness;
    }

    context.putImageData(pixels, 0, 0);
  }
  // export
  Evme.CollectionIcon = CollectionIcon;

})();
