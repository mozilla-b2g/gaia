/* globals Promise */

(function(exports) {
  'use strict';

  /* measurements */
  // computed when calling init() with maxIconSize
  var scale;

  var height;
  var width;
  var center;

  // diameter of center app icon
  var dMain;

  // diameter of side app icons
  var dSide;

  // app icons centering
  var vOffset;
  var hOffset;

  var xMain;
  var yMain;

  var xLeft;
  var xRight;
  var ySide;


  /* constants */

  // number of app icons in the collection icon
  const numAppIcons = 3;

  // darkness of to side icons
  const sideIconDarken = 0.65;

  // gradient stops: top to bottom
  const gradStops = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'];

  const defaultBgFill = 'rgba(51, 51, 51, 0.85)';
  const deafultBgImage = '/style/images/icon_default.png';


  function blobToDataURI(blob) {
    return new Promise(function convert(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function systemXHR(url) {
    return new Promise(function doXHR(resolve, reject) {
      var xhr = new XMLHttpRequest({
        mozAnon: true,
        mozSystem: true
      });

      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onerror = reject;
      xhr.onload = function onload() {
        var status = xhr.status;
        if (status !== 0 && status !== 200) {
          reject();
        } else {
          blobToDataURI(xhr.response).then(resolve, reject).catch(reject);
        }
      };

      try {
        xhr.send(null);
      } catch (e) {
        reject(e);
        return;
      }
    });
  }

  function CollectionIcon(config) {

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.height = height;
    canvas.width = width;

    // everything we draw will be cropped inside the rounded icon
    context.arc(center, center, center, 0, 2 * Math.PI);
    context.clip();
    context.save();

    this.canvas = canvas;
    this.context = context;

    // iconSrcs: array of urls to fetch icons from
    this.iconSrcs = config.iconSrcs || [];

    // bgSrc: base64 image
    this.bgSrc = config.bgSrc || null;

  }

  Object.defineProperty(CollectionIcon, 'numAppIcons', {
    get: function get() {
      return numAppIcons;
    }
  });

  CollectionIcon.init = function init(maxIconSize) {
    // measurements are based on a 60px icon (cf. bug 965711)
    scale = maxIconSize/60;

    height = maxIconSize;
    width = maxIconSize;
    center = maxIconSize / 2;

    // diameter of center app icon
    dMain = Math.round(22 * scale);

    // diameter of side app icons
    dSide = Math.round(14 * scale);

    // app icons centering
    vOffset = Math.round(13 * scale);
    hOffset = Math.round(21 * scale);

    xMain = center - dMain / 2;
    yMain = height - (vOffset + dMain/2);

    xLeft = center - hOffset - dSide / 2;
    xRight = center + hOffset - dSide / 2;
    ySide = height - (vOffset + dSide/2);
  };

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
        console.log(e);
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

      window.Promise.all(iconPromises).then(
        function appIconsReady(canvases) {
          var center = canvases[0];
          var right = canvases[1];
          var left = canvases[2];

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
          console.log(e);
        });
    });

    return p;
  };

  // retrieve icon from url and render into new canvas
  // return the canvas
  CollectionIcon.prototype.createAppIcon =
                  function createAppIcon(url, darkness) {

    return new Promise(function done(resolve){
      if (url) {
        systemXHR(url).then(function success(src) {
          var img = new Image();

          img.onload = function _onload() {
            var imgCanvas = document.createElement('canvas');
            var ctx = imgCanvas.getContext('2d');
            var imgWidth = img.width;
            var imgHeight = img.height;

            imgCanvas.width = imgWidth;
            imgCanvas.height = imgHeight;

            // we need rounded icons (API returns rectangular icons)
            ctx.arc(imgWidth/2, imgHeight/2, imgWidth/2, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

            if (darkness) {
              darken(imgCanvas, ctx, darkness);
            }

            resolve(imgCanvas);
          };

          img.onerror = function _onerror() {
            resolve(null);
          };

          img.src = src;
        }, function error(e) {
          resolve(null);
        });

      } else {
        resolve(null);
      }
    });
  };

  CollectionIcon.prototype.drawBg = function drawBg() {
    var self = this;

    var p = new Promise(function done(resolve) {
      if (self.bgSrc) {
        var img = new Image();

        img.onload = function _onload() {
          var ratio = Math.max(width/this.width, height/this.height);

          var w = ratio * this.width;
          var h = ratio * this.height;

          var wOffset = width - w;
          var hOffset = height - h;

          self.context.drawImage(img, wOffset / 2 , hOffset / 2, w, h);

          self.drawGrad();
          resolve();
        };

        img.onerror = function _onerror() {
          self.drawDefaultBg().then(resolve);
        };

        img.src = self.bgSrc;

      } else {
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
    var pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    var data = pixels.data;
    var l = data.length;

    for (var i = 0; i < l; i+=4) {
      data[i] *= darkness;
      data[i+1] *= darkness;
      data[i+2] *= darkness;
    }

    context.putImageData(pixels, 0, 0);
  }

  // export
  exports.CollectionIcon = CollectionIcon;

})(window);
