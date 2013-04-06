function pick(type, nocrop, width, height) {
  var data = {type: type};
  if (nocrop) data.nocrop = true;
  if (width) data.width = width;
  if (height) data.height = height;
  var a = new MozActivity({ name: 'pick', data: data});
  a.onsuccess = function(e) {
    console.log('got blob of type', a.result.blob.type);
    var url = URL.createObjectURL(a.result.blob);
    var img = document.getElementById('result');
    img.src = url;
    img.onload = function() { URL.revokeObjectURL(url); };
  };
  a.onerror = function() { alert('Failure picking photo'); };
}

document.getElementById('b1').onclick = function() { pick('image/jpeg'); };
document.getElementById('b2').onclick = function() { pick('image/png'); };
document.getElementById('b3').onclick = function() {
  pick(['image/jpeg', 'image/png']);
};
document.getElementById('b4').onclick = function() { pick('image/*'); };
document.getElementById('b5').onclick = function() { pick('image/*', true); };
document.getElementById('b6').onclick = function() { pick('image/*', false,
                                                          100, 100); };
