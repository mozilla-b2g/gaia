/* global Service, BaseUI */
'use strict';

(function(exports) {
  /**
   * BaseIcon is a base class for all icons on statusbar
   * @param {Object} manager The manager object
   *                         who has the information for the icon
   * @param {Number} [index] Specify the index if it is not a singleton
   */
  var BaseIcon = function(manager, index) {
    if (index !== undefined) {
      this.index = index;
      this.debug('index=',index);
    } else {
      this.index = '';
    }
    this.amendProperty();
    this.manager = manager;
    this.publish('created');
  };
  BaseIcon.prototype = Object.create(BaseUI.prototype);
  BaseIcon.prototype.constructor = BaseIcon;
  BaseIcon.prototype.DEBUG = false;

  BaseUI.prototype.view = function bu_view() {
    var view = '<div id="' + this.instanceID;
    view += '" class="' + this.CLASS_NAME + '"></div>';
    return view;
  };

  BaseIcon.prototype.setOrder = function(priority) {
    this.element.style.order = priority;
  };

  BaseIcon.prototype.camelToDash = function(strings) {
    var i = 0;
    var ch = '';
    while (i <= strings.length) {
      var character = strings.charAt(i);
      if (character !== character.toLowerCase()) {
        if (ch === '') {
          ch += character.toLowerCase();
        } else {
          ch += '-' + character.toLowerCase();
        }
      } else {
        ch += character;
      }
      i++;
    }
    return ch;
  };
  BaseIcon.prototype.amendProperty = function() {
    if (!this.name) {
      throw new Error('please specify a name when constructing a new icon');
    }
    var pureName = this.name.replace(/Icon$/, '');
    this.dashPureName = this.camelToDash(pureName);
    this.instanceID = 'statusbar-' + this.dashPureName;
    if (!this.CLASS_LIST) {
      this.CLASS_LIST = 'sb-icon sb-icon-' + this.dashPureName;
    }
    if (!this.l10nId) {
      this.l10nId = 'statusbar' + pureName;
    }
  };
  BaseIcon.prototype.EVENT_PREFIX = 'icon';
  BaseIcon.prototype.name = 'BaseIcon';

  // Overload me
  BaseIcon.prototype.instanceID = 'statusbar-base';
  BaseIcon.prototype.additionalProperties = '';
  BaseIcon.prototype.role = 'listitem';

  /**
   * This flag is normally true because most icons want to update
   * the status once it's rendered. But for certain special icon
   * they don't want to be updated on started, set this flag to false.
   * @type {Boolean}
   */
  BaseIcon.prototype.UPDATE_ON_START = true;
  BaseIcon.prototype.show = function(force) {
    if (!this.element) {
      return;
    }
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    if (!force) {
      this.publish('shown');
    }
  };
  BaseIcon.prototype.hide = function() {
    if (!this.element) {
      return;
    }
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  BaseIcon.prototype.render = function() {
    this.publish('willrender');
    Service.request('Statusbar:iconContainer', this)
      .then(function(container) {
        this.containerElement = container;
        this.containerElement.insertAdjacentHTML('afterbegin', this.view());
        this._fetchElements();
        this._registerEvents();
        var selector = '#' + this.instanceID;
        this.element = this.containerElement.querySelector(selector);
        this.hide();
        this.element.classList.add('active');
        this.UPDATE_ON_START && this.update();
        this.onrender && this.onrender();
        this.publish('rendered');
      }.bind(this)
    );
    return true;
  };
  /**
   * An icon would be enabled once it is started.
   * We will try to render then update if necessary.
   */
  BaseIcon.prototype.start = function() {
    if (this._started) {
      return;
    }
    this.debug('starting..');
    this._started = true;
    this._start();
    // If we are already rendered, update right away.
    this.render();
    this.UPDATE_ON_START && this.update();
    // Integration test needs to toggle some icons actively.
    Service.register('show', this);
    Service.register('hide', this);
    Service.registerState('isVisible', this);
    Service.register('update', this);
    // Integration test needs to stop some icons actively.
    Service.register('stop', this);
  };
  BaseIcon.prototype.onrender = function() {};
  BaseIcon.prototype._start = function() {};
  BaseIcon.prototype.stop = function() {
    if (!this._started) {
      return;
    }
    this._started = false;
    this._stop();
    this.hide();
    this.element && this.element.classList.remove('active');
    Service.register('start', this);
  };
  BaseIcon.prototype._stop = function() {};
  BaseIcon.prototype.isVisible = function() {
    return !!(this.element && !this.element.hidden && this.enabled());
  };
  BaseIcon.prototype.handleEvent = function(evt) {
    this.update();
  };
  /**
   * this.update() will be controlled by the icon's manager actively.
   * Override this function if your icon has more behavior than
   * just showing/hiding.
   *
   * If update() is not overrided, you should at least override shouldDisplay()
   * to let update know how to show/hide the icon.
   */
  BaseIcon.prototype.update = function() {
    if (!this.enabled() || !this.element) {
      this.debug('not started or no element');
      this.debug(this._started);
      this.debug(this.element);
      return;
    }
    this.shouldDisplay() ? this.show() : this.hide();
  };
  BaseIcon.prototype.enabled = function() {
    return this._started;
  };
  BaseIcon.prototype.updateLabel = function(type, active) {
    if (!this.element && !this.isVisible()) {
      return;
    }
    navigator.mozL10n.setAttributes(this.element, (active ?
      'statusbarIconOnActive-' : 'statusbarIconOn-') + type);
  };
  /**
   * The result of this function will be used in this.update()
   * to decide to show or hide the icon.
   * @return {Boolean} Should show the icon or not
   */
  BaseIcon.prototype.shouldDisplay = function() {
    throw 'Should be implemented by the Icon constructor.';
  };
  exports.BaseIcon = BaseIcon;
}(window));
