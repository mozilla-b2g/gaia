var shareImage = document.querySelector("#share-image"),
        imgToShare = document.querySelector("#image-to-share");
    if (shareImage && imgToShare) {
        shareImage.onclick = function () {
            if(imgToShare.naturalWidth > 0) {
                // Create dummy canvas
                var blobCanvas = document.createElement("canvas");
                blobCanvas.width = imgToShare.width;
                blobCanvas.height = imgToShare.height;

                // Get context and draw image
                var blobCanvasContext = blobCanvas.getContext("2d");
                blobCanvasContext.drawImage(imgToShare, 0, 0);

                // Export to blob and share through a Web Activitiy
                blobCanvas.toBlob(function (blob) {
                    var sharingImage = new MozActivity({
                        name: "share",
                        data: {
                            type: "image/*",
                            number: 1,
                            blobs: [blob]
                        }
                    });
                });
            }
            else {
                alert("Image failed to load, can't be shared");
            }
        }
    }
