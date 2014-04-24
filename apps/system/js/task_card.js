/* globals Card */

/* exported TaskCard */

'use strict';

(function(exports) {

  /**
   * A card in a task manager, representing a single app
   *
   * @class TaskCard
   * @param {Object} config to associate the card with a given app and
   *                        how it should be displayed
   * @extends Card
   */
  function TaskCard(config) {
    return Card.call(this, config);
  }

  TaskCard.prototype = Object.create(Card.prototype);
  TaskCard.prototype.constructor = TaskCard;
  TaskCard.prototype.CLASS_NAME = 'TaskCard';
  TaskCard.prototype.EVENT_PREFIX = 'taskcard-';

  /**
   * How much to scale the current card
   * @type {Float}
   * @memberof TaskCard.prototype
   */
  TaskCard.prototype.SCALE_FACTOR = 0.5;

  /**
   * How much to scale card when not the current card
   * @type {Float}
   * @memberof TaskCard.prototype
   */
  TaskCard.prototype.SIBLING_SCALE_FACTOR = 0.5;

  /**
   * Opacity to apply when not the current card
   * @type {Float}
   * @memberof TaskCard.prototype
   */
  TaskCard.prototype.SIBLING_OPACITY = 1.0;

  /**
   * Transition to apply when moving the card
   * @type {String}
   * @memberof TaskCard.prototype
   */
  TaskCard.prototype.MOVE_TRANSITION = '-moz-transform .3s, opacity .3s';

  TaskCard.prototype._populateViewData = function tc_populateViewData() {
    Card.prototype._populateViewData.call(this);
    this.favoriteButtonVisibility = 'visible';
  };

  TaskCard.prototype._template = '<section class="card-inner">' +
    '<header class="card-header"><h1 class="title">{title}</h1>' +
    '<p class="subtitle">{subTitle}</p></header>' +
    '<div class="appPreview"></div>' +
    '<footer class="card-tray">'+
      '<button class="appIcon" data-button-action="select" ' +
      '   style="background-image:{iconValue}">' +
      '</button>' +
      '<menu class="buttonbar">' +
        '<button class="close-button" data-button-action="close" ' +
        '   role="button" ' +
        '   style="visibility: {closeButtonVisibility}"></button>' +
        '<button class="favorite-button" data-button-action="favorite" ' +
        '   role="button" ' +
        '   style="visibility: {favoriteButtonVisibility}"></button>' +
    '</menu></footer>' +
  '</section>';

  /**
   * Build a card representation of an app window.
   * @memberof TaskCard.prototype
   */
  TaskCard.prototype.render = function tc_render() {
    Card.prototype.render.call(this);
    this.app.enterTaskManager();
    return this.element;
  };

  TaskCard.prototype._fetchElements = function tc__fetchElements() {
    this.headerContent = this.element.querySelector('header.card-header');
    this.footerContent = this.element.querySelector('footer.card-tray');
    this.footerMenu = this.element.querySelector('.buttonbar');
  };

  /**
   * Unhook the appWindow and destroy the card
   * @memberof TaskCard.prototype
   */
  TaskCard.prototype.destroy = function tc_destroy() {
    var app = this.app;
    if (app) {
      app.leaveTaskManager();
    }
    Card.prototype.destroy.call(this);
  };

  /**
   * Update display of card when it enters the viewport
   * @memberof TaskCard.prototype
   */
  TaskCard.prototype.onViewport = function tc_onViewport(event) {
    var card = this.element;
    var windowHeight = this.manager.windowHeight;

    this.headerContent.style.transform = 'translateY(-' +
                                          (windowHeight * 0.25) + 'px)';
    this.footerContent.style.transform = 'translateY(' +
                                          (windowHeight * 0.25) + 'px)';
    card.style.display = 'block';

    if (this.getScreenshotPreviewsSetting()) {
      card.classList.remove('appIconPreview');
      return;
    } else {
      card.classList.add('appIconPreview');
    }
    return;
  };

  /**
   * Move the card. The offsets and resulting transforms are caculated and
   *                applied seperately for the card and appWindow elements
   *
   * @memberof TaskCard.prototype
   * @param deltaX number of pixels to move on X axis
   * @param deltaY number of pixels to move on Y axis
   */
  TaskCard.prototype.move = function(deltaX, deltaY) {
    deltaX = deltaX || 0;
    deltaY = deltaY || 0;
    var windowWidth = this.manager.windowWidth;
    var windowWidthMinusOne = windowWidth - 0.0001;

    var offset = this.position - this.manager.currentPosition;
    var positionX = deltaX + offset * windowWidthMinusOne;
    var gutter = 2 * offset;
    var scaleFactor = offset ? this.SIBLING_SCALE_FACTOR : this.SCALE_FACTOR;
    var cardTransform = new Transform();
    var appTransform = new Transform({ scale: scaleFactor });

    if (deltaX || offset) {
      appTransform.translateX = offset ?
          'calc(' + gutter  + 'rem + ' + positionX + 'px)' :
          positionX ? positionX + 'px' : 0;
      cardTransform.translateX = offset ?
          'calc(' + (scaleFactor * gutter) + 'rem'  + ' + ' +
            (scaleFactor * positionX * 1.5) + 'px)' :
          positionX ? (scaleFactor * positionX) + 'px' : 0;
    } else {
      cardTransform.translateX = 0;
    }
    if (deltaY) {
      appTransform.translateY = deltaY + 'px';
      cardTransform.translateY = scaleFactor * deltaY + 'px';
    }

    this.element.style.MozTransform = cardTransform.toString();
    this.app.transform(appTransform);
  };


  /**
   * Selectively batch apply style properties, to either the card or appWindow
   * as appropriate
   * @memberof TaskCard.prototype
   * @param {Object} nameValues object with style property names as keys
   *                            and values to apply to the card/appWindow
   */
  TaskCard.prototype.applyStyle = function tc_applyStyle(nameValues) {
    var cardStyle = {};
    var appWindowStyle = {};
    var pValue, pName;
    for (pName in nameValues) {
      pValue = nameValues[pName];
      switch (pName) {
        case 'MozTransform':
          cardStyle[pName] = pValue.replace(/(scale|translateY)\([^\)]+\)\s*/gi,
                                        '');
          appWindowStyle[pName] = pValue;
          break;
        case 'zIndex':
        case 'pointerEvents':
          cardStyle[pName] = pValue;
          break;
        default:
          cardStyle[pName] = pValue;
          appWindowStyle[pName] = pValue;
      }
    }
    Card.prototype.applyStyle.call(this, cardStyle);
    this.app.applyStyle(appWindowStyle);
  };

  // Helper for managing css transform properties
  function Transform(props) {
    for(var key in props) {
      this[key] = props[key];
    }
  }
  Transform.prototype.toString = function transform_toString() {
    var str = Object.keys(this).map(function(key) {
      return key + '(' + this[key] + ')';
    }, this).join(' ');
    return str;
  };

  return (exports.TaskCard = TaskCard);

})(window);

