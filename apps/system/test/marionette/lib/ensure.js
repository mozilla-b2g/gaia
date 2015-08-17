'use strict';
(function(module) {
  var Ensure = function() {};
  Ensure.prototype.start =
  function(client) {
    this._actions = client.loader.getActions();
    this.client = client;
    this.elements = {};
    this.footprintCounter = 0;
    this.configs = {
      footprint: 'marionette-js-ensure-footprint',
      selectorFootprint: '[data-marionette-js-ensure-footprint]'
    };
    // XXX: when it becomes an app, should has its own app info class.
    this.lockScreenFrameOrigin = 'app://lockscreen.gaiamobile.org';
    this.lockScreenFrameId = 'lockscreen-frame';
    return this;
  };

  Ensure.prototype.systemReady =
  function() {
    this.client.waitFor((function() {
      return this.client.executeScript(function() {
        return null ===
          window.wrappedJSObject.document.getElementById('os-logo');
      });
    }).bind(this));
  };

  /**
   * Check if the element is valid (not stale or dettached).
   */
  Ensure.prototype.validateElement =
  function(element) {
    try {
      element.scriptWith(function() {});
    } catch (e) {
      return false;
    }
    return true;
  };

  Ensure.prototype.launch =
  function(origin) {
    this.client.apps.launch(origin);
    this.client.apps.switchToApp(origin);

    // Wait until the app has told us it's fully loaded.
    this.client.waitFor((function() {
      return null !== this.client.findElement('body.loaded');
    }).bind(this));
    this.frame(origin);
    return this;
  };

  /**
   * Since navigator.mozSettings sometimes is null,
   * especially when switching into the app frame without
   * the permission, we need to do this check.
   */
  Ensure.prototype.settings =
  function() {
    this.client.waitFor((function() {
      var result = this.client.executeScript(function() {
        var settings = window.wrappedJSObject.navigator.mozSettings;
        var isNotNull = (null !== settings);
        settings = null;
        return isNotNull;
      });
      return result;
    }).bind(this));
  };

  Ensure.prototype.close =
  function(origin) {
    this.client.switchToFrame();
    var appFrame = this.client.findElement('iframe[src*="' + origin + '"]');
    this.client.switchToFrame(appFrame);
    this.client.executeScript(function() {
      window.wrappedJSObject.close();
    });
    this.client.waitFor((function() {
      var searchTimeout = this.client.searchTimeout;
      this.client.setSearchTimeout(0);

      var frames = this.client.findElements('iframe[mozapp]');
      this.client.setSearchTimeout(searchTimeout);

      return frames.reduce(function(prev, frame) {
        if (frame.getAttribute('mozapp').match(origin)) {
          return false;
        }
      }, true);
    }).bind(this));
    return this;
  };

  Ensure.prototype.frame =
  function(origin) {
    // System is the only one exception to check visible:
    // everything is withing System.
    if (!origin) {
      this.client.switchToFrame();
      return this;
    } else if (origin === this.lockScreenFrameOrigin) {
      // To System frame first.
      this.client.switchToFrame();

     this.client.executeScript(function(origin, lockScreenFrameId) {
        // XXX: Before we make LockScreen as an iframe or app,
        // we need this to do the check, while keep compability.
        var elementAtCenter = document.elementFromPoint(
          window.innerWidth>>1 , window.innerHeight>>1);
        if (lockScreenFrameId === elementAtCenter.id) {
          return true;
        }
        while (null !== elementAtCenter.parentElement) {
          if (lockScreenFrameId === elementAtCenter.id) {
            return true;
          } else {
            elementAtCenter = elementAtCenter.parentElement;
          }
        }
        throw new Error('Want to switch to LockScreen frame but it is' +
          'invisible. The last detected element\'s ID is: ' +
          elementAtCenter.id);
      }, [origin, this.lockScreenFrameId]);

     return this;
    }
    // To System frame first.
    this.client.switchToFrame();

    this.client.waitFor((function() {
      return this.client.executeScript(function(origin) {
        var element = document.elementFromPoint(
          window.innerWidth>>1 , window.innerHeight>>1);
        if ('IFRAME' !== element.nodeName) {
          return false;
        } else {
          return true;
        }
      });
    }).bind(this));
    // Check the element at the center of the System frame
    var frameElement = this.client.executeScript(function(origin) {
      var element = document.elementFromPoint(
        window.innerWidth>>1 , window.innerHeight>>1);
      if (!element.getAttribute('mozapp') &&
          element.dataset.frameOrigin &&
          element.dataset.frameOrigin.match(origin)) {
        // No mozapp frame: ordinary frame.
        return element;
      } else if (!element.getAttribute('mozapp').match(origin)) {
        throw new Error('User would never switch to a invisible frame.' +
          'the target origin is :' + origin +
          'the fetched origin is :' + element.getAttribute('mozapp'));
      }
      return element;
    }, [origin]);
    this.client.switchToFrame(frameElement);
    this.client.executeScript(function() {
      if (document.hidden) {
        throw new Error('User would never switch to a invisible frame. ' +
          'The frame is hidden.');
      }
    });
    return this;
  };

  /**
   * If element is a function, would execute it in client's context and
   * get the element by returning.
   */
  Ensure.prototype.element =
  function(element, argumentsList) {
    if (!element) {
      throw new Error('No such element or element generator');
    }
    if ('function' === typeof element) {
      element = this.client.executeScript(element, argumentsList);
    }
    if (!element) {
      throw new Error('No such element after execute the generator');
    }
    this.elements.current = this.patchElement(element);
    return this;
  };

  /**
   * Set current element with an alias.
   * So user can manipulate on a new element.
   */
  Ensure.prototype.as =
  function(name) {
    this.elements[name] = this.elements.current;
    return this;
  };

  /**
   * Use the specify element as the current element.
   */
  Ensure.prototype.use =
  function(name) {
    if (!this.elements[name]) {
      throw new Error('No such element with the name: ' + name);
    }
    this.elements.current = this.elements[name];
    return this;
  };

  /**
   * If give an action, execute it and wait the element become
   * displayed. If give no such action, check the element directly.
   */
  Ensure.prototype.displayed =
  function(action) {
    if ('function' === typeof action) {
      action();
      this.client.waitFor((function() {
        return this.elements.current.displayed();
      }).bind(this), function() {
        throw new Error('The element is not displayed even after the action');
      });
    } else {
      if (!this.elements.current.displayed()) {
        throw new Error('The element is not displayed');
      }
    }
    return this;
  };

  Ensure.prototype.dispatch =
  function(name, detail) {
    this.client.executeScript(function(name, detailContent) {
      var eventDetail = {
        detail: detailContent
      };
      var event = new window.wrappedJSObject.CustomEvent(name, eventDetail);
      window.wrappedJSObject.dispatchEvent(event);
    }, [name, detail]);
    return this;
  };

  /**
   * Will call the predicition with named elements.
   * The current, unamed element would be 'current'.
   */
  Ensure.prototype.must =
  function(prediction, description) {
    try {
      this.client.waitFor((function() {
        return prediction(this.elements);
      }).bind(this));
    } catch(e) {
      description = description || 'unknown';
      throw new Error('Ensure.must failed to guarantee: ' + description);
    }
    return this;
  };

  /**
   * No busy waiting or throwing error, just return true or false.
   */
  Ensure.prototype.if =
  function(prediction) {
    return !!prediction(this.elements);
  };

  Ensure.prototype.assert =
  function(prediction) {
    if (this.if(prediction)) {
      throw new Error('ASSERTION FAILED');
    }
  };

  // Has valid location {x, y}
  Ensure.prototype.located =
  function() {
    if ('number' !== typeof this.elements.current.location().x ||
        'number' !== typeof this.elements.current.location().y) {
      throw new Error('The element has no valid location.');
    }
    return this;
  };

  /**
   * Perform an action chain of MarionetteJS on the element.
   * Need to decorate all element related methods to partial
   * apply the element on them.
   */
  Ensure.prototype.actions =
  function() {
    var actions = this._actions;
    // Decorate methods according to different rules.
    var result = Object.keys(this._actions.__proto__)
      .reduce((function (acc, fname) {
        switch (fname) {
          // These functions need to partial apply the element on it.
          case 'doubleTap':
          case 'flick':
          case 'longPress':
          case 'move':
          case 'press':
          case 'tap':
            acc[fname] = (function() {
              var args = Array.prototype.slice.call(arguments);
              args.unshift(this.elements.current);
              args = this.centerAction(fname, args);
              actions[fname].apply(actions, args);
              this.footprint();
              return acc;
            }).bind(this);
            break;
          // After perform, need to return to the ensure chain.
          case 'perform':
            acc.perform = (function() {
              actions.perform();
              return this;
            }).bind(this);
            break;
          default:
            acc[fname] = (function() {
              actions[fname].apply(actions, arguments);
              return acc;
            }).bind(this);
            break;
        }
        return acc;
    }).bind(this), {});

    // I have found that flick !== drag & drop...
    result.pull = (function(offsetX, offsetY) {
      actions
        .press(this.elements.current)
        .moveByOffset(offsetX, offsetY)
        .release();
      return result;
    }).bind(this);
    return result;
  };

  /**
   * Make sure the tapping action would tap at the center of element.
   * No matter the bug of MarionetteJS get fixed or not, we do our best
   * to prevent any 'surprise'.
   */
  Ensure.prototype.centerAction =
  function(actionName, args) {
    switch (actionName) {
      case 'tap':
      case 'press':
      case 'doubleTap':
        var element = args[0];
        var x = args[1];
        var y = args[2];
        var box = element.scriptWith(function(element) {
          var rect = element.getBoundingClientRect();
          // XXX: we must click on the (1/2 - 1/4) of the
          // element center on Y axis to make sure it click
          // to the element. Y at 1/2 would lead to click on
          // other elements if they're too close.
          return { x: rect.width >> 1,
                   y: (rect.height >> 1) -
                      (rect.height >> 2) };
        });
        if ('undefined' === typeof x) {
          args[1] = box.x;
        }
        if ('undefined' === typeof y) {
          args[2] = box.y;
        }
      break;
    }
    return args;
  };

  Ensure.prototype.patchElement =
  function(element) {
    element.position = function() {
      return element.scriptWith(function(elem) {
        var box = elem.getBoundingClientRect();
        return { x: box.x, y: box.y };
      });
    };
    return element;
  };

  /**
   * To print and trace states.
   * cb: function(elements)
   */
  Ensure.prototype.trace =
  function(cb) {
    cb(this.elements);
    return this;
  };

  /**
   * Don't know why 'wait' only for action chain,
   * while 'waitFor' only for Client...
   */
  Ensure.prototype.sleep =
  function(timeout) {
    this._actions.wait(timeout).perform();
    return this;
  };

  /**
   * Leave footprint on the current element.
   */
  Ensure.prototype.footprint =
  function () {
    this.elements.current.scriptWith(
    function(element, footprint, footprintCounter) {
      // Can't use 'dataset[key] = value: Syntax error in MaronetteJS
      element.setAttribute('data-' + footprint, footprintCounter);
    }, [this.configs.footprint, this.footprintCounter]);
    this.footprintCounter += 1;
    return this;
  };

  /**
   * Apply style on all elements have footprints.
   */
  Ensure.prototype.showFootprints =
  function(stylesOrName, style) {
    var styles = stylesOrName;
    var styleFunction;
    if ('string' === typeof stylesOrName) {
      if (!style) {
        throw new Error('No corresponding style for the key: ' + stylesOrName);
      }
      styles = {};
      styles[stylesOrName] = style;
    } else if ('function' === typeof stylesOrName) {
      styleFunction = stylesOrName;
    }
    var elements = this.client
      .findElements(this.configs.selectorFootprint);
    elements.forEach((function(element) {
      element.scriptWith(function(element, selector, styles, styleFunction) {
        if (styleFunction) {
          styleFunction(element);
        } else {
          Object.keys(styles).forEach(function(name) {
            element.style[name] = styles[name];
          });
        }
      }, [this.configs.selectorFootprint, styles, styleFunction]);
    }).bind(this));
    return this;
  };

  module.exports = Ensure;
})(module);
