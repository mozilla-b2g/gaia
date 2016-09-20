'use strict';

/* global SwipeablePageView, SwipeablePanelView */

(function(exports) {

function DynamicPageView() {
  SwipeablePageView.apply(this, arguments);

  //XXX: this is a mock
  this._model = {
    getLayout: function() {
     var keys = [ { compositeKey: '😀', type: 'emoji' },
                  { compositeKey: '😊', type: 'emoji' },
                  { compositeKey: '☺', type: 'emoji' },
		  { compositeKey: '😉', type: 'emoji' },
		  { compositeKey: '😍', type: 'emoji' },
		  { compositeKey: '😘', type: 'emoji' },
		  { compositeKey: '😚', type: 'emoji' },
		  { compositeKey: '😗', type: 'emoji' },
		  { compositeKey: '😙', type: 'emoji' },
		  { compositeKey: '😜', type: 'emoji' } ];

     var randomKeys = keys.filter(function() {
       return (Math.random() >= 0.5);
     });

     return  {  panelKeys: randomKeys };
    }
  };
}

DynamicPageView.prototype = Object.create(SwipeablePageView.prototype);

DynamicPageView.prototype.render = function() {
  var layout = this.layout;

  var container = document.createElement('div');
  this.element = container;
  if (this.options.classNames) {
    container.classList.add.apply(container.classList, this.options.classNames);
  }

  if (layout.specificCssRule) {
    container.classList.add(layout.layoutName);
  }

  this._renderPanel();
  container.appendChild(this.swipeablePanel.element);

  this._renderKeys();

  // XXX: need this so that the switching keys would be visible.
  if (!layout.secondLayout) {
    container.classList.add('uppercase-only');
  }
};

DynamicPageView.prototype._renderPanel = function() {
  var recentLayout = this._model.getLayout();
  var swipeablePanel = new SwipeablePanelView(recentLayout,
      { totalWidth: this.options.totalWidth },
      this.viewManager);
  swipeablePanel.render();

  this.swipeablePanel = swipeablePanel;
};

DynamicPageView.prototype.refresh = function() {
  this.element.removeChild(this.swipeablePanel.element);
  this._renderPanel();

  this.element.insertBefore(this.swipeablePanel.element,
                            this.element.firstChild);
};

exports.DynamicPageView = DynamicPageView;

})(window);
