/* global _ */
/* global Toolbar */

'use strict';

/**
 * Browser App Tooltip.
 * @namespace Tooltip
 */
var Tooltip = {
  tooltipBlock: null,
  showTimeoutID: null,
  hideTimeoutID: null,
  hideTimeoutData: 100,
  overObj: null,
  moveObj: null,
  showTarget: null,

  /**
   * initialize
   */
  init: function tooltip_init() {
    this.tooltipBlock = document.getElementById('tooltip-block');

    var elements = [
      {target: Toolbar.sidebarButtonBlock},
      {target: Toolbar.backButtonBlock},
      {target: Toolbar.forwardButtonBlock},
      {target: Toolbar.addressButton},
      {target: Toolbar.searchInput},
      {target: Toolbar.bookmarkButtonBlock},
      {target: Toolbar.showBookmarksButtonBlock},
      {target: Toolbar.homeButtonBlock},
      {target: Toolbar.zoomButtonBlock},
      {target: Toolbar.tabsButtonBlock},
      {target: Toolbar.newTabButtonBlock},
      {target: Toolbar.menuButtonBlock},
      {target: Toolbar.modeButtonBlock},
    ];

    this.overObj = this.mouseoverEvent.bind(this);
    this.moveObj = this.mousemoveEvent.bind(this);
    // toolbar icon
    elements.forEach(function addEvent(elm) {
      var target = elm.target;
      // add event
      target.addEventListener('mouseover', this.overObj);
      target.addEventListener('mouseout', this.mouseoutEvent.bind(this));
      target.addEventListener('mousedown', this.clickEvent.bind(this));
      target.addEventListener('mouseup', this.clickEvent.bind(this));
    }, this);
  },

  /**
   * mousemove event
   */
  mousemoveEvent: function tooltip_mousemoveEvent(ev) {
    if(this.isShow()) {
      // hide the tooltip in mouse movement at tooltip display.
      this.stopMousemoveEvent(ev.target);
      this.hideTimeoutID = setTimeout(function(){
        Tooltip.hide();
      }, this.hideTimeoutData);
      return;
    }
    if(this.showTimeoutID) {
      clearTimeout(this.showTimeoutID);
    }

    var bounds = ev.currentTarget.getBoundingClientRect();
    var posY = Math.ceil(bounds.bottom);
    var top = Math.ceil(bounds.top);
    var tips = null;
    if(ev.target.dataset.tips != null && ev.target.dataset.tips != undefined) {
      if(ev.target == Toolbar.searchInput) {
        tips = ev.target.dataset.tips;
      } else {
        tips = _(ev.target.dataset.tips);
      }
    }
    this.showTimeoutID = setTimeout(function(){
      Tooltip.showTarget = ev.target;
      var disp = {
        top: top,
        text: tips,
        x: ev.pageX,
        //y: ev.pageY
        y: posY,
      };
      Tooltip.displaySetting(disp);
    }, 150);
  },
  startMousemoveEvent: function tooltip_startMousemoveEvent(target) {
    target.addEventListener('mousemove', this.moveObj);
  },
  stopMousemoveEvent: function tooltip_stopMousemoveEvent(target) {
    target.removeEventListener('mousemove', this.moveObj);
  },

  /**
   * mouseover event
   */
  mouseoverEvent: function tooltip_mouseoverEvent(ev) {
    this.startMousemoveEvent(ev.target);
  },

  /**
   * mouseout event
   */
  mouseoutEvent: function tooltip_mouseoutEvent(ev) {
    this.hide();
  },

  /**
   * click event
   */
  clickEvent: function tooltip_clickEvent(ev) {
    this.hide();
  },

  /**
   * show tooltip
   */
  isShow: function tooltip_isShow(target) {
    if(!target){
      return this.tooltipBlock.classList.contains('visible');
    } else {
      if(target == this.showTarget){
        return this.tooltipBlock.classList.contains('visible');
      } else {
        return false;
      }
    }
  },

  /**
   * show tooltip
   */
  show: function tooltip_show() {
    this.tooltipBlock.classList.add('visible');
  },

  /**
   * hide tooltip
   */
  hide: function tooltip_hide() {
    clearTimeout(this.showTimeoutID);
    clearTimeout(this.hideTimeoutID);
    this.tooltipBlock.classList.remove('visible');
  },

  /**
   * display setting
   */
  displaySetting: function tooltip_displaySetting(disp) {
    if(disp.text == null || disp.text == undefined) {
      return;
    }
    this.show();
    this.tooltipBlock.style.left = '0px';
    this.tooltipBlock.innerHTML = disp.text.replace(/\\n/g, '<br>');

    // pos x adjustment
    // 25 = scrollbar margin
    var maxW = this.tooltipBlock.offsetWidth + disp.x + 25;
    var posX = disp.x;
    if(maxW >= Browser.SCREEN_WIDTH) {
      // 58 = margin
      posX = Browser.SCREEN_WIDTH - this.tooltipBlock.offsetWidth - 58;
    }

    // pos y adjustment
    var bounds = this.tooltipBlock.getBoundingClientRect();
    var hg = Math.ceil(bounds.height);
    var posY = disp.y + 20;
    var maxH = posY + hg;
    if(maxH >= Browser.SCREEN_HEIGHT) {
      // hover item
      posY = disp.top - 20 - hg;
    }

    this.tooltipBlock.style.top = (posY + 0) + 'px';
    this.tooltipBlock.style.left = (posX + 0) + 'px';
  },
};

