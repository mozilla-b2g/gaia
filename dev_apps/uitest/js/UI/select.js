function changeTest(evt) {
  console.log('++select++ onchange: ' + this.selectedIndex);
}

function blurTest(evt) {
  console.log('++select++ onblur: ' + this.id);
}

window.addEventListener('load', function() {
  var elementList = ['singleSel', 'multiSel', 'sizeSel'];
  elementList.forEach(function(elementId) {
      console.log('elementId: ' + elementId);
      document.getElementById(elementId).onchange = changeTest;
      document.getElementById(elementId).addEventListener('blur', blurTest);
  });
});
