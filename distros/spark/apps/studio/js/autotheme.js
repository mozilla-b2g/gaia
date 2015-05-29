/*global
  Color,
  ColorThief,
  Defer,
  MozActivity
*/

'use strict';

/**
 * @exports AutoTheme
 * @event AutoTheme:palette This is emitted when a new palete has been generated
 * from an image.
 */

(function(exports) {
  // is autotheming active
  var active;

  function loadImage(src) {
    var defer = new Defer();

    var img = new Image();
    img.src = src;

    if (img.complete) {
      defer.resolve(img);
    } else {
      img.onload = () => defer.resolve(img);
      img.onerror = defer.reject;
    }

    return defer.promise;
  }

  function blobFromURL(src) {
    var defer = new Defer();

    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      defer.resolve(xhr.response);
    });
    xhr.addEventListener('error', defer.reject);

    xhr.open('GET', src);
    xhr.responseType = 'blob';
    xhr.send();

    return defer.promise;
  }

  var AutoTheme = exports.AutoTheme = {
    get active() {
      return active;
    },
    set active(bool) {
      active = bool;
      document.body.classList.toggle('has-autotheme', bool);
    },
    elts: {
      commandCreate: document.querySelectorAll('.autotheme-command-create'),
      commandCancel: document.querySelectorAll('.autotheme-command-cancel')
    },

    handleEvent(e) {
      switch(e.type) {
        case 'click':
          this.pickImage()
            .then(this.getPalette.bind(this))
            .then(this.storePalette.bind(this));
          break;
      }
    },

    /* called from activity */
    load(blob) {
      return this.getPalette(blob)
        .then(this.storePalette.bind(this));
    },

    pickImage() {
      var defer = new Defer();

      if (window.MozActivity) {
        var activity = new MozActivity({
          name: 'pick',
          data: { type: 'image/*' }
        });

        activity.onsuccess = () => defer.resolve(activity.result.blob);
        activity.onerror = defer.reject;
      } else {
        defer.resolve(blobFromURL('img/default_image.jpg'));
      }

      return defer.promise;
    },

    getPalette(blob) {
      function imageFromBlob(blob) {
        var blobUrl = window.URL.createObjectURL(blob);
        return loadImage(blobUrl).then((image) => {
          window.URL.revokeObjectURL(image.src);
          return image;
        });
      }

      this.image = blob;

      var defer = new Defer();

      imageFromBlob(blob).then((image) => {
        var colorThief = new ColorThief();
        var palette = colorThief.getPalette(image, 10);
        defer.resolve(palette);
      });

      return defer.promise;
    },

    storePalette(palette) {
      if (palette === null) {
        this.clean();
      } else {
        this.palette = palette.map(Color);
        this.active = true;
      }
      this.emit('palette');
    },

    showPalette(where) {
      where.textContent = '';

      if (!this.palette) {
        return;
      }

      this.palette.forEach((color) => {
        var elt = document.createElement('div');
        elt.className = 'palette-item';
        elt.style.backgroundColor = color.toCSS();
        elt.dataset.color = color.toJSONString();
        where.appendChild(elt);
      });
    },

    clean() {
      this.active = false;
      this.palette = null;
      this.image = null;
    },

    asStorable() {
      if (!this.active) {
        return null;
      }

      return {
        palette: this.palette.map((color) => color.toStorable()),
        image: this.image
      };
    },

    fromStorable(stored) {
      if (stored === null) {
        this.clean();
        return;
      }

      this.palette = stored.palette.map(Color.fromStorable);
      this.image = stored.image;
      this.active = true;
      this.emit('palette');
    },

    emit(name) {
      var event = new CustomEvent('AutoTheme:' + name);
      window.dispatchEvent(event);
    }
  };

  Array.from(AutoTheme.elts.commandCreate).forEach(
    elt => elt.addEventListener('click', AutoTheme)
  );
  Array.from(AutoTheme.elts.commandCancel).forEach(
    elt => elt.addEventListener('click', () => AutoTheme.storePalette(null))
  );
})(window);
