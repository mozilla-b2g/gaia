'use strict';

// Load custom build of Modernizr if an appropriate build has not been loaded.
if (!window['Modernizr'] || Modernizr.touch === undefined || Modernizr.csstransitions === undefined || Modernizr.csstransforms === undefined || Modernizr.csstransforms3d === undefined) {

  /* Modernizr 2.5.2 (Custom Build) | MIT & BSD
   * Build: http://www.modernizr.com/download/#-csstransforms-csstransforms3d-csstransitions-touch-cssclasses-teststyles-testprop-testallprops-prefixes-domprefixes
   */
  ;window.Modernizr=function(a,b,c){function z(a){j.cssText=a}function A(a,b){return z(m.join(a+";")+(b||""))}function B(a,b){return typeof a===b}function C(a,b){return!!~(""+a).indexOf(b)}function D(a,b){for(var d in a)if(j[a[d]]!==c)return b=="pfx"?a[d]:!0;return!1}function E(a,b,d){for(var e in a){var f=b[a[e]];if(f!==c)return d===!1?a[e]:B(f,"function")?f.bind(d||b):f}return!1}function F(a,b,c){var d=a.charAt(0).toUpperCase()+a.substr(1),e=(a+" "+o.join(d+" ")+d).split(" ");return B(b,"string")||B(b,"undefined")?D(e,b):(e=(a+" "+p.join(d+" ")+d).split(" "),E(e,b,c))}var d="2.5.2",e={},f=!0,g=b.documentElement,h="modernizr",i=b.createElement(h),j=i.style,k,l={}.toString,m=" -webkit- -moz- -o- -ms- ".split(" "),n="Webkit Moz O ms",o=n.split(" "),p=n.toLowerCase().split(" "),q={},r={},s={},t=[],u=t.slice,v,w=function(a,c,d,e){var f,i,j,k=b.createElement("div"),l=b.body,m=l?l:b.createElement("body");if(parseInt(d,10))while(d--)j=b.createElement("div"),j.id=e?e[d]:h+(d+1),k.appendChild(j);return f=["&#173;","<style>",a,"</style>"].join(""),k.id=h,m.innerHTML+=f,m.appendChild(k),l||g.appendChild(m),i=c(k,a),l?k.parentNode.removeChild(k):m.parentNode.removeChild(m),!!i},x={}.hasOwnProperty,y;!B(x,"undefined")&&!B(x.call,"undefined")?y=function(a,b){return x.call(a,b)}:y=function(a,b){return b in a&&B(a.constructor.prototype[b],"undefined")},Function.prototype.bind||(Function.prototype.bind=function(b){var c=this;if(typeof c!="function")throw new TypeError;var d=u.call(arguments,1),e=function(){if(this instanceof e){var a=function(){};a.prototype=c.prototype;var f=new a,g=c.apply(f,d.concat(u.call(arguments)));return Object(g)===g?g:f}return c.apply(b,d.concat(u.call(arguments)))};return e});var G=function(c,d){var f=c.join(""),g=d.length;w(f,function(c,d){var f=b.styleSheets[b.styleSheets.length-1],h=f?f.cssRules&&f.cssRules[0]?f.cssRules[0].cssText:f.cssText||"":"",i=c.childNodes,j={};while(g--)j[i[g].id]=i[g];e.touch="ontouchstart"in a||a.DocumentTouch&&b instanceof DocumentTouch||(j.touch&&j.touch.offsetTop)===9,e.csstransforms3d=(j.csstransforms3d&&j.csstransforms3d.offsetLeft)===9&&j.csstransforms3d.offsetHeight===3},g,d)}([,["@media (",m.join("touch-enabled),("),h,")","{#touch{top:9px;position:absolute}}"].join(""),["@media (",m.join("transform-3d),("),h,")","{#csstransforms3d{left:9px;position:absolute;height:3px;}}"].join("")],[,"touch","csstransforms3d"]);q.touch=function(){return e.touch},q.csstransforms=function(){return!!F("transform")},q.csstransforms3d=function(){var a=!!F("perspective");return a&&"webkitPerspective"in g.style&&(a=e.csstransforms3d),a},q.csstransitions=function(){return F("transition")};for(var H in q)y(q,H)&&(v=H.toLowerCase(),e[v]=q[H](),t.push((e[v]?"":"no-")+v));return z(""),i=k=null,e._version=d,e._prefixes=m,e._domPrefixes=p,e._cssomPrefixes=o,e.testProp=function(a){return D([a])},e.testAllProps=F,e.testStyles=w,g.className=g.className.replace(/(^|\s)no-js(\s|$)/,"$1$2")+(f?" js "+t.join(" "):""),e}(this,this.document);
}

if (!window['Pushpop']) window.Pushpop = {};

Pushpop.defaultTransition = 'slide-horizontal';

Pushpop.View = function(element) {
  var $element = this.$element = $(element);
  
  var view = $element.data('view');
  if (view) return view;
  
  this.element = $element[0];
  
  $element.data('view', this);
};

Pushpop.View.prototype = {
  element: null,
  $element: null,
  transition: null,
  setTransition: function(value) {
    this.transition = value;
    this.$element.addClass(value);
  },
  getViewStack: function() {
    return this.$element.parents('.pp-view-stack:first').data('viewStack');
  },
  forceReflow: function() {
    this.element.offsetWidth;
  }
};

Pushpop.ViewStack = function(element) {
  var $element = this.$element = $(element);
  this.element = $element[0];
  
  var views = this.views = [];
  
  var $rootViewElement = $element.children('.pp-view.root,.pp-view:first').first().addClass('active');
  var rootView = this.rootView = $rootViewElement.data('view') ||
    new Pushpop.View($rootViewElement.addClass('root'));
  
  views.push(rootView);
  
  $element.data('viewStack', this);
};

Pushpop.ViewStack.prototype = {
  element: null,
  $element: null,
  views: null,
  rootView: null,
  isTransitioning: false,
  handleEvent: function(evt) {
    switch (evt.type) {
      case 'webkitTransitionEnd':
      case 'transitionend':
      case 'oTransitionEnd':
      case 'transitionEnd':
        var eventData = evt.data;
        if (!eventData) return;
        
        var newActiveView = eventData.newActiveView;
        if (!newActiveView || evt.target !== newActiveView.element) return;
        
        var viewStack = newActiveView.getViewStack();
        var oldActiveView = viewStack.$element.children('.pp-view.active').data('view');
        if (!oldActiveView) return;
        
        var $newActiveViewElement = newActiveView.$element;
        var $oldActiveViewElement = oldActiveView.$element;
        
        $newActiveViewElement.unbind(evt);
        $newActiveViewElement.addClass('active');
        $newActiveViewElement.removeClass('transition push pop ' + newActiveView.transition);
        $oldActiveViewElement.removeClass('active transition push pop ' + newActiveView.transition);
        
        viewStack.isTransitioning = false;
        break;
      default:
        break;
    }
  },
  push: function(view, transition) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    
    var oldActiveView = this.getActiveView();
    var newActiveView = view;
    
    this.views.push(newActiveView);
    
    var $oldActiveViewElement = oldActiveView.$element;
    var $newActiveViewElement = newActiveView.$element;

    $newActiveViewElement.bind('webkitTransitionEnd transitionend oTransitionEnd transitionEnd', {
      newActiveView: newActiveView
    }, this.handleEvent);
    
    transition = newActiveView.transition = transition || newActiveView.transition || Pushpop.defaultTransition;
    
    $oldActiveViewElement.addClass('push ' + transition);
    $newActiveViewElement.addClass('push ' + transition);
    
    oldActiveView.forceReflow();
    newActiveView.forceReflow();
    
    $oldActiveViewElement.addClass('transition');
    $newActiveViewElement.addClass('transition');
  },
  pop: function(viewOrTransition, transition) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    
    var views = this.views;
    if (views.length <= 1) return;
    
    var oldActiveView = this.getActiveView();
    var newActiveView;
    
    if (viewOrTransition && typeof viewOrTransition !== 'string') {
      newActiveView = viewOrTransition;
      
      if (this.containsView(newActiveView)) {
        while (views.length > 1 && this.getActiveView() !== newActiveView) {
          views.pop();
        }
      }
    } else {
      if (viewOrTransition) transition = viewOrTransition;
      
      views.pop();
      newActiveView = this.getActiveView();
    }
    
    var $oldActiveViewElement = oldActiveView.$element;
    var $newActiveViewElement = newActiveView.$element;

    $newActiveViewElement.bind('webkitTransitionEnd transitionend oTransitionEnd transitionEnd', {
      newActiveView: newActiveView
    }, this.handleEvent);
    
    transition = newActiveView.transition = transition || oldActiveView.transition || Pushpop.defaultTransition;
    
    $oldActiveViewElement.addClass('pop ' + transition);
    $newActiveViewElement.addClass('pop ' + transition);
    
    oldActiveView.forceReflow();
    newActiveView.forceReflow();
    
    $oldActiveViewElement.addClass('transition');
    $newActiveViewElement.addClass('transition');
  },
  getActiveView: function() {
    var views = this.views;
    var viewCount = views.length;
    
    return (viewCount === 0) ? null : views[viewCount - 1];
  },
  containsView: function(view) {
    var views = this.views;
    var viewCount = views.length;
    
    for (var i = viewCount - 1; i >= 0; i--) if (views[i] === view) return true;
    return false;
  }
};

$(function() {
  var $views = $('.pp-view');
  
  $views.each(function(index, element) {
    new Pushpop.View(element);
  });
  
  var $viewStacks = $('.pp-view-stack');
  
  $viewStacks.each(function(index, element) {
    new Pushpop.ViewStack(element);
  });
  
  $('a.push').live('click', function(evt) {
    var $this = $(this);
    var href = $this.attr('href');
    var $viewElement = $(href);
    
    var view = $viewElement.data('view') || new Pushpop.View($viewElement);
    var viewStack = view.getViewStack();
    if (viewStack) viewStack.push(view, $this.data('transition'));
    
    evt.preventDefault();
  });
  
  $('a.pop').live('click', function(evt) {
    var $this = $(this);
    var href = $this.attr('href');
    var viewStack;
    
    if (href === '#') {
      viewStack = $this.parents('.pp-view-stack:first').data('viewStack');
      if (viewStack) viewStack.pop($this.data('transition'));
    } else {
      var $viewElement = $(href);
    
      var view = $viewElement.data('view') || new Pushpop.View($viewElement);
      viewStack = view.getViewStack();
      if (viewStack) viewStack.pop(view, $this.data('transition'));
    }
    
    evt.preventDefault();
  });
});
