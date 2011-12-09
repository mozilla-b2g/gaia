var Camera = {
  init: function cameraInit() {
    chooser = document.getElementById('chooser');
    chooser.addEventListener('change', this.showPreview);
  },

  showPreview: function cameraShowPreview() {
    var file = document.getElementById('chooser').files.item(0);
    var image = document.getElementById('preview');
    image.file = file;
    var reader = new FileReader();
    reader.onload = (function readerOnload(loadedFile) {
      return function fileHandler(evt) {
        loadedFile.src = evt.target.result;
        loadedFile.classList.remove('hidden');
      };
    })(image);
    reader.readAsDataURL(file);
  }
};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});
