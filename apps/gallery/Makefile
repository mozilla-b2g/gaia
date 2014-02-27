-include $(PWD)/build/common.mk

BUILD_DIR=$(PWD)/build_stage/gallery

FULLSCREEN_SCRIPTS = \
 ../../shared/js/gesture_detector.js \
 ../../shared/js/format.js \
 ../../shared/js/media/video_player.js \
 ../../shared/js/media/media_frame.js \
 js/frames.js

METADATA_SCRIPTS = \
 ../../shared/js/blobview.js \
 ../../shared/js/media/jpeg_metadata_parser.js \
 ../../shared/js/media/get_video_rotation.js \
 js/imagesize.js \
 js/MetadataParser.js

all: concatenated_scripts clean
	@echo Building gallery app to build_stage...
	@mkdir -p $(BUILD_DIR)
	@cp -r * $(BUILD_DIR)
	@$(call run-app-js-command, build)

concatenated_scripts: js/frame_scripts.js js/metadata_scripts.js

js/frame_scripts.js: Makefile $(FULLSCREEN_SCRIPTS)
	cat $(FULLSCREEN_SCRIPTS) > js/frame_scripts.js

js/metadata_scripts.js: Makefile $(METADATA_SCRIPTS)
	cat $(METADATA_SCRIPTS) > js/metadata_scripts.js

clean:
	@rm -rf $(BUILD_DIR)
