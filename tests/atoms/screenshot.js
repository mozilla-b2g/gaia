return (function takeScreenshot() {
  var canvas = document.createElementNS('http://www.w3.org/1999/xhtml',
                                        'canvas');
  var width = window.innerWidth;
  var height = window.innerHeight;
  canvas.setAttribute('width', width);
  canvas.setAttribute('height', height);

  var context = canvas.getContext('2d');
  var flags =
    context.DRAWWINDOW_DRAW_CARET |
    context.DRAWWINDOW_DRAW_VIEW |
    context.DRAWWINDOW_USE_WIDGET_LAYERS;

  context.drawWindow(window, 0, 0, width, height,
                     'rgb(255,255,255)', flags);

  return context.canvas.toDataURL('image/png');

}.apply(this, arguments));
