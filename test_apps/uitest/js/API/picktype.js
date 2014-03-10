function pick(type, allowCrop, width, height) {
  var data = {type: type};
  data.allowCrop = allowCrop;
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
  pick(['video/*', 'image/*'], true);
};
document.getElementById('b2').onclick = function() {
  pick(['image/*', 'video/*'], false);
};
document.getElementById('b3').onclick = function() {
  pick(['image/*', 'video/*'], true, 100, 100);
};
document.getElementById('b4').onclick = function() {
  pick(['video/*', 'image/jpg']);
};
document.getElementById('b5').onclick = function() {
  pick(['video/*', 'image/png']);
};
document.getElementById('b6').onclick = function() {
  pick(['video/3gpp', 'image/jpg']);
};

