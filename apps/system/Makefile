all: copy-camera-app

# This make target copies the camera app to System app
# and use it as the secure camera.
.PHONY: copy-camera-app
copy-camera-app:
	@rm -rf ./camera
	@cp -r ../camera ./camera
	@rm ./camera/manifest.webapp
	@rm -rf ./camera/test
