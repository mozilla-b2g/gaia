'use strict';
/* global eme */
/* global Promise */

(function (exports) {

  // choose best ratio for device
  function chooseBackgroundRatio(pixelRatio) {
    // background ratios supported by mozilla cdn
    var backgroundOptions = [1, 1.5, 2, 2.25];

    return Math.max.apply(null,
        backgroundOptions.filter((r) => pixelRatio >= r));
  }

  const backgroundRatio = chooseBackgroundRatio(window.devicePixelRatio);

  const suffix =
    backgroundRatio === 1 ? '.jpg' : ('@' + backgroundRatio + 'x.jpg');
  const mozBgUrl =
    'http://fxos.cdn.mozilla.net/collection/background/{categoryId}' + suffix;


  function Common() {}

  Common.prototype = {

    b64toBlob: function b64toBlob(b64) {
      return new Promise((resolve, reject) => {
        var img = new Image();

        img.onload = function onload() {
          var canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(resolve);
        };

        img.onerror = reject;

        img.src = b64;
      });
    },

    chooseBackgroundRatio: chooseBackgroundRatio,

    // TODO
    // add support for 'size' parameter (like getEmeBackground has) to fetch
    // smaller backgrounds when the full size image is not required
    // (like when creating collection icons)
    getMozBackground: function getMozBackground(collection) {
      if (!collection.categoryId) {
        return Promise.reject('no categoryId');
      }

      var url = mozBgUrl.replace('{categoryId}', collection.categoryId);
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', url);
      xhr.responseType = 'blob';

      return new Promise((resolve, reject) => {
        xhr.onload = function onload() {
          if (xhr.status === 200) {
            var blob = new Blob([xhr.response], {type: 'image/jpg'});
            eme.log('getMozBackground', 'success', url);

            resolve({
              blob: blob,
              source: url,
              checksum: 'mozilla'  // TODO: generate checksum from image data
            });

          } else {
            reject('xhr.status ' + xhr.status);
          }
        };

        xhr.onerror = function onerror() {
          reject('xhr error');
        };

        xhr.send();
      });

    },

    getEmeBackground: function getEmeBackground(collection, size) {
      var checksum;

      var options = {
        width: size || undefined,
        height: size || undefined
      };

      if (collection.categoryId) {
        options.categoryId = collection.categoryId;
      }
      else {
        options.query = collection.query;
      }

      if (collection.background) {
        checksum = collection.background.checksum;

        // when we send _checksum server will not return an image if checksum
        // was not updated, so check that we really have background data
        if (collection.background.blob) {
          options._checksum = checksum;
        }
      }

      return eme.api.Search.bgimage(options)
        .then((response) => {
          if (checksum && checksum === response.checksum) {
            eme.log('background didn\'t change (checksum match)');
            return collection.background;
          } else {
            var b64;
            var image = response.response.image;
            if (image) {
              b64 = image.data;
              if (/image\//.test(image.MIMEType)) {  // base64 image data
                b64 = 'data:' + image.MIMEType + ';base64,' + image.data;
              }
            }

            return this.b64toBlob(b64).then(function toBg(blob) {

              return {
                blob: blob,
                source: response.response.source,
                checksum: response.checksum || null
              };
            });
          }
        });
    },


    // get background for a collection from
    // 1. mozilla cdn
    // 2. e.me api
    getBackground: function getBackground(collection, size) {
      return this.getMozBackground(collection)
            .catch(function (e) {
              eme.log('getBackground', e, 'trying e.me background');
              return this.getEmeBackground(collection, size);
            }.bind(this))
            .catch(function (e) {
              eme.log('getBackground', 'failed', e);
            });
    }
  };

  exports.Common = new Common();

}(window));
