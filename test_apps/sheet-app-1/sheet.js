document.addEventListener('click', function(evt) {
  if (evt.target.tagName.toLowerCase() !== 'button') {
    return;
  }
  if (evt.target.dataset.target) {
    window.open(evt.target.dataset.target, evt.target.dataset.target);
  } else {
    window.close();
  }
});

if (document.getElementById('back')) {
  document.getElementById('back').addEventListener('click', function() {
    window.close();
  });
}