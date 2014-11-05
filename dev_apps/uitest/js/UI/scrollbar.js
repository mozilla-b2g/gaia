window.addEventListener('load', function() {
  var p = document.getElementById('probe');
  document.getElementById('report').textContent =
    'Scroll bar width calculated from Javascript: ' +
    (p.offsetWidth - p.scrollWidth - 2) + 'px'; // 2 = border width * 2
});
