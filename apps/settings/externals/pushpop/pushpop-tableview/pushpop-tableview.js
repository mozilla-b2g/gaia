'use strict';

if (!window['Pushpop']) window.Pushpop = {};

Pushpop.TableView = function(element) {
  var kMaximumTapArea = 5;
  
  var _$activeCell = null;
  var _$activeCellLink = null;
  var _isMouseDown = false;
  
  var $window = $(window['addEventListener'] ? window : document.body);
  var $element = this.$element = $(element);
  
  var tableview = $element.data('tableview');
  if (tableview) return tableview;
  
  this.element = $element[0];
  
  var activeCellLinkClickHandler = function(evt) {
    $(this).unbind(evt);
    evt.stopImmediatePropagation();
    evt.preventDefault();
  };
  
  $element.delegate('li', 'mousedown touchstart', function(evt) {
    _isMouseDown = (evt.type === 'mousedown' && !Modernizr.touch) || evt.type === 'touchstart';
    
    _$activeCell = $(this);
    _$activeCellLink = _$activeCell.children('a:first');
    
    _$activeCellLink.unbind('click', activeCellLinkClickHandler);
    
    if (_isMouseDown) {
      _$activeCell.addClass('active');
    } else {      
      _$activeCellLink.bind('click', activeCellLinkClickHandler);
    }
  });
  
  $window.bind('mousemove touchmove', function(evt) {
    if (!_isMouseDown) return;
    
    _$activeCellLink.unbind('click', activeCellLinkClickHandler);
    _$activeCellLink.bind('click', activeCellLinkClickHandler);
    
    _$activeCell.removeClass('active');
    _$activeCell = null;
    _$activeCellLink = null;
    _isMouseDown = false;
  });
  
  $window.bind('mouseup touchend', function(evt) {
    if (!_isMouseDown) return;
    
    if (evt.type === 'touchend') {
      _$activeCellLink.unbind('click', activeCellLinkClickHandler);
      _$activeCellLink.trigger('click');
    }
    
    _$activeCell.removeClass('active');
    _$activeCell = null;
    _$activeCellLink = null;
    _isMouseDown = false;
  });
  
  $element.data('tableview', this);
};

Pushpop.TableView.prototype = {
  element: null,
  $element: null
};

$(function() {
  var $tableviews = $('.pp-tableview');
  
  $tableviews.each(function(index, element) {
    new Pushpop.TableView(element);
  });
});
