
(function(exports) {
  'use strict';

  const ANIMATION_TIMER = 400;

  var TEST_LIST = [
    {
      'imageUrl': 'style/banners/banner_temp_01.jpg',
      'title': 'title1',
      'description': 'description1'
    }, {
      'imageUrl': 'style/banners/banner_temp_02.jpg',
      'title': 'title2',
      'description': 'description2'
    }, {
      'imageUrl': 'style/banners/banner_temp_03.jpg',
      'title': 'title3',
      'description': 'description3'
    }, {
      'imageUrl': 'style/banners/banner_temp_04.jpg',
      'title': 'title4',
      'description': 'description4'
    }, {
      'imageUrl': 'style/banners/banner_temp_05.jpg',
      'title': 'title5',
      'description': 'description5'
    }, {
      'imageUrl': 'style/banners/banner_temp_06.jpg',
      'title': 'title6',
      'description': 'description6'
    }, {
      'imageUrl': 'style/banners/banner_temp_07.jpg',
      'title': 'title7',
      'description': 'description7'
    }, {
      'imageUrl': 'style/banners/banner_temp_08.jpg',
      'title': 'title8',
      'description': 'description8'
    }, {
      'imageUrl': 'style/banners/banner_temp_09.jpg',
      'title': 'title9',
      'description': 'description9'
    }, {
      'imageUrl': 'style/banners/banner_temp_10.jpg',
      'title': 'title10',
      'description': 'description10'
    }
  ];

  /**
   * PromotionList controls everything on the upper half of AppDeck
   * @class PromotionList
   */
  function PromotionList() {}

  var proto = PromotionList.prototype;

  proto.init = function() {
    this.bannerContainer = document.getElementById('app-deck-list');
    this.container = document.getElementById('app-deck-main-banner');
    this.animator = document.getElementById('app-deck-animation-banner');

    this.animator.addEventListener('transitionend', this);

    this._initBannerSize(this.animator);
    this._initBannerSize(this.container);

    this.animator.classList.add('hidden');

    // load test content.
    TEST_LIST.forEach(this._createBanner.bind(this));
    // set first one as context item.
    this.setContextItem(0);
  };

  proto._createBanner = function(item, index) {
    var div = document.createElement('div');
    div.classList.add('app-banner');

    var btn = document.createElement('smart-button');
    btn.setAttribute('type', 'banner-button');
    btn.classList.add('app-deck-list-item');
    btn.style.backgroundImage = 'url(\'' + item.imageUrl + '\'), ' +
                                'url(\'style/icons/ic_default_app.png\')';
    btn.dataset.index = index;

    btn.addEventListener('focus', this);

    div.appendChild(btn);
    this.bannerContainer.appendChild(div);
  };

  proto._initBannerSize = function pl_initBannerSize(container) {
    var bg = container.querySelector('.banner-background');
    var text = container.querySelector('.banner-text-container');

    text.style.width = bg.style.width = container.clientWidth + 'px';
  };

  proto._fillMainBanner = function pl_fillMainBanner(container, item) {
    var bg = container.querySelector('.banner-background');
    var title = container.querySelector('.banner-title');
    var desc = container.querySelector('.banner-description');
    bg.style.backgroundImage = 'url(\'' + item.imageUrl + '\')';
    title.textContent = item.title;
    desc.textContent = item.description;
  };

  proto._slideItemIn = function pl_slideItemIn(item) {
    // fill animation and start to slide
    this._fillMainBanner(this.animator, item);
    // cancel previous one if we already have it.
    this._cancelSliding();

    // remove hidden and add standby to prepare for the startup of animation.
    this.animator.classList.remove('hidden');
    this.animator.classList.add('standby');

    this._animationTimeout = setTimeout(function() {
      this._contextItem = item;
      this.animationTimeout = 0;
      this.animator.classList.remove('standby');
      this.animator.classList.add('sliding');
      this.container.classList.add('sliding');
    }.bind(this), ANIMATION_TIMER);
  };

  proto._cancelSliding = function pl_cancelSliding() {
    if (this._animationTimeout) {
      clearTimeout(this._animationTimeout);
      this._animationTimeout = 0;
      // If _animationTimeout is not 0, it means the animation is prepared but
      // is not triggered. So, we need to rollback the state while clear the
      // timer.
      this.animator.classList.remove('standby');
      this.animator.classList.add('hidden');
    }
  };

  proto.setContextItem = function pl_setContextItem(idx) {
    var item = TEST_LIST[idx];

    if (!this._contextItem) {
      // If context item is undefined or null, it's first context item, we just
      // set it without animation.
      this._contextItem = item;
      this._fillMainBanner(this.container, item);
      return;
    }

    if (this._contextItem === item) {
      // If the context item is self, we don't need to slide anything and should
      // clear all pending or sliding timer.
      if (this.animator.classList.contains('sliding')) {
        // If _contextItem is sliding now, we should clear the pending animation
        // which means user presses key back and forward quickly.
        this._pendingAnimationItem = null;
      } else {
        // We still need to clear the sliding timer because the waiting item may
        // not be current item.
        this._cancelSliding();
      }
      return;
    }

    if (this.animator.classList.contains('sliding')) {
      this._pendingAnimationItem = item;
      return;
    }
    this._slideItemIn(item);
  };

  proto._handleFocusChange = function(evt) {
    if (evt.target.dataset.index === null ||
        typeof(evt.target.dataset.index) === 'undefined') {
      return;
    }

    this.setContextItem(evt.target.dataset.index);
  };

  proto._handleTransitionEnd = function(evt) {
    if (evt.propertyName !== 'transform' ||
        evt.currentTarget !== this.animator) {
      return;
    }
    // banner-background is the last one to move. Once it is moved, we should
    // set all data to main container.
    if (evt.target.classList.contains('banner-background')) {
      this.animator.classList.add('hidden');
      this.animator.classList.remove('sliding');
      this.container.classList.remove('sliding');
      this._fillMainBanner(this.container, this._contextItem);

      if (this._pendingAnimationItem) {
        this._slideItemIn(this._pendingAnimationItem);
        this._pendingAnimationItem = null;
      }
    }
  };

  proto.handleEvent = function(evt) {

    switch(evt.type) {
      case 'focus':
        this._handleFocusChange(evt);
        break;
      case 'transitionend':
        this._handleTransitionEnd(evt);
        break;
    }
  };

  exports.PromotionList = PromotionList;

})(window);
