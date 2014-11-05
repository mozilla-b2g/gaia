document.getElementById('close').onclick = function() {
  window.close();
};

document.getElementById('open').onclick = function() {
  window.open('/tests_html/UI/popup.html', '', 'dialog');
};

window.addEventListener('resize', function() {
  if (window.innerHeight > 60) {
    document.body.style.backgroundColor = 'white';
    document.body.style.fontSize = '20px';
    document.body.style.color = 'black';
  } else {
    document.body.style.backgroundColor = 'green';
    document.body.style.fontSize = '10px';
    document.body.style.color = 'white';
  }
});