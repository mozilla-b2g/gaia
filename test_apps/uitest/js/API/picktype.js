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
  a.onerror = function() { alert('Failure picking'); };
}

document.getElementById('b1').onclick = function() {
  pick(['video/*', 'image/*']);
};
document.getElementById('b2').onclick = function() {
  pick(['image/*', 'video/*']);
};
document.getElementById('b3').onclick = function() {
  pick(['video/*', 'image/jpg']);
};
document.getElementById('b4').onclick = function() {
  pick(['video/*', 'image/png']);
};
document.getElementById('b5').onclick = function() {
  pick(['video/3gpp', 'image/jpg']);
};

