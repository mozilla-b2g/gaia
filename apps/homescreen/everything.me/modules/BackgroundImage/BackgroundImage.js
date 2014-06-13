'use strict';

Evme.BackgroundImage = new function Evme_BackgroundImage() {
  var NAME = 'BackgroundImage',
      self = this,
      el = null,
      elFullScreen = null,
      elFullScreenParent = null,
      elementsToFade = null,
      elStyle = null,
      currentImage = null,
      elCurrentImage = null,
      active = false,
      changeOpacityTransitionCallback = null,
      defaultImage = '',
      bgImage = null,
      TIMEOUT_BEFORE_REMOVING_OLD_IMAGE = 1500;

  this.init = function init(options) {
    !options && (options = {});

    defaultImage = options.defaultImage || '';
    el = options.el;
    elFullScreenParent = options.elFullScreenParent;
    elStyle = el.style;

  elementsToFade = document.querySelectorAll('*[data-opacity-on-swipe=true]');
  elementsToFade = Array.prototype.slice.call(elementsToFade, 0);

    Evme.EventHandler.trigger(NAME, 'init');

    bgImage = document.querySelector('#bgimage-overlay');

    Evme.$('.close, .img', bgImage, function onElement(el) {
      el.addEventListener('touchstart', function onTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();

        self._currentFullscreenCallback && self._currentFullscreenCallback();
      });
    });

    Evme.$('.rightbutton', bgImage)[0].addEventListener('click',
      function setWallpaper(e) {
        e.stopPropagation();

        Evme.EventHandler.trigger(NAME, 'setWallpaper', {
          'image': currentImage.image
        });
      });

    Evme.$('.source', bgImage)[0].addEventListener('click',
      function openURL() {
        if (currentImage.source) {
          Evme.Utils.sendToOS(Evme.Utils.OSMessages.OPEN_URL, {
            'url': currentImage.source
          });
        }
      });
  };

  this.update = function update(oImage, isDefault) {
    if (typeof oImage === 'string') {
      oImage = {
        'image': oImage,
        'source': '',
        'query': ''
      };
    }

    if (!currentImage || currentImage.image !== oImage.image) {
      removeCurrent();

      if (isDefault) {
        el.classList.add('default');
      } else {
        currentImage = oImage;

        elCurrentImage = Evme.$create('div', {'class': 'img'});
        elCurrentImage.style.backgroundImage =
                                            'url(' + currentImage.image + ')';
        el.appendChild(elCurrentImage);

        cbUpdated(currentImage);

        window.setTimeout(function onTimeout() {
          elCurrentImage.classList.add('visible');

          window.setTimeout(function onTimeout() {
            el.classList.remove('default');
          }, 300);
        }, 10);
      }
    }
  };

  this.loadDefault = function loadDefault() {
    self.update(defaultImage, true);
  };

  this.clear = function clear() {
    removeCurrent();
  };

  function onElementsToFade(cb) {
  for (var i = 0, el; el = elementsToFade[i++];) {
      cb.call(el);
    }
  }

  this.fadeFullScreen = function fadeFullScreen(per) {
    per = Math.max(1 - (Math.round(per * 100) / 100), 0);
    for (var i = 0, el; el = elementsToFade[i++];) {
      el.style.opacity = per;
    }
  };

  this.cancelFullScreenFade = function cancelFullScreenFade() {
    onElementsToFade(function onElement() {
      this.classList.add('animate');
    });

    window.setTimeout(function onTimeout() {
      onElementsToFade(function onElement() {
        this.style.cssText = this.style.cssText.replace(/opacity: .*;/, '');
      });

      window.setTimeout(function onTimeout() {
        onElementsToFade(function onElement() {
          this.classList.remove('animate');
        });
      }, 500);
    }, 0);

  };

  this.showFullScreen = function showFullScreen(closeCallback) {
    onElementsToFade(function onElement() {
      this.classList.add('animate');
    });
    window.setTimeout(function onTimeout() {
      onElementsToFade(function onElement() {
        this.style.opacity = 0;
      });
    }, 0);

    closeCallback = closeCallback || self.closeFullScreen;

    elFullScreen = self.getFullscreenElement(currentImage, closeCallback);

    window.setTimeout(function onTimeout() {
      elFullScreen.classList.add('ontop');
      elFullScreen.classList.add('active');
    }, 0);

    active = true;

    cbShowFullScreen();
  };

  this._currentFullscreenCallback;
  this.getFullscreenElement = function getFullscreenElement(data, cb) {
    !data && (data = currentImage);

    var el = bgImage;
    el.querySelector('.img').style.backgroundImage = 'url(' + data.image + ')';
    el.querySelector('h2').textContent = data.query || '';
    el.querySelector('.source span').textContent = data.source;

    el.classList.toggle('nosource', !data.source);
    el.classList.toggle('noquery', !data.query);

    self._currentFullscreenCallback = cb;

    return el;
  };

  this.closeFullScreen = function closeFullScreen(e) {
    if (elFullScreen && active) {
      self.cancelFullScreenFade();
      elFullScreen.classList.remove('active');
      elFullScreen.classList.remove('ontop');

      e && e.preventDefault();
      cbHideFullScreen();
      active = false;
      return true;
    }

    active = false;
    return false;
  };

  this.isFullScreen = function isFullScreen() {
    return active;
  };

  this.get = function get() {
    return currentImage || {'image': defaultImage};
  };

  this.changeOpacity = function changeOpacity(value, duration, cb) {
    if (duration) {
      changeOpacityTransitionCallback = cb;
      elStyle.MozTransition = 'opacity ' + duration + 'ms linear';
      el.addEventListener('transitionend', transitionEnd);
    }
    this.closeFullScreen();
    elStyle.opacity = value;
  };

  function transitionEnd(e) {
    el.removeEventListener('transitionend', transitionEnd);
    elStyle.MozTransition = '';
    window.setTimeout(function onTimeout() {
      changeOpacityTransitionCallback && changeOpacityTransitionCallback();
      changeOpacityTransitionCallback = null;
    }, 0);
  }

  function removeCurrent() {
    if (elCurrentImage) {
      // Keep it as a local var cause it might change during this timeout
      var elRemove = elCurrentImage;
      elRemove.classList.remove('visible');
      currentImage = {};

      cbRemoved();

      window.setTimeout(function onTimeout() {
        Evme.$remove(elRemove);
      }, TIMEOUT_BEFORE_REMOVING_OLD_IMAGE);
    }
  }

  function imageLoaded() {
    cbLoaded();
  }

  function cbUpdated(image) {
    Evme.EventHandler.trigger(NAME, 'updated', {
      'image': image
    });
  }

  function cbRemoved() {
    Evme.EventHandler.trigger(NAME, 'removed');
  }

  function cbLoaded() {
    Evme.EventHandler.trigger(NAME, 'load', {
      'image': currentImage
    });
  }

  function cbShowFullScreen() {
    Evme.EventHandler.trigger(NAME, 'showFullScreen');
  }

  function cbHideFullScreen() {
    Evme.EventHandler.trigger(NAME, 'hideFullScreen');
  }

  Object.defineProperty(this, 'elFullScreen', {
    get: function() {
      return elFullScreen;
    }
  });
}
