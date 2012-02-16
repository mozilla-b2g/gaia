
B2G_HOMESCREEN=file://${GAIA}/homescreen.html
INJECTED_GAIA = "$(MOZ_OBJDIR)/_tests/testing/mochitest/browser/gaia"
TEST_PATH=gaia/tests/${TEST_FILE}


mochitest:
	test -L $(INJECTED_GAIA) || ln -s $(GAIA) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS=--browser-arg=""

# The targets below all require adb
# It should be in your path somewhere, or you can edit this line
# to specify its location.
ADB=adb


# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use the install-gaia target of the B2G Makefile. But if you're
# working on just gaia itself, and you already have B2G firmware on your
# phone, and you have adb in your path, then you can use this target to
# update the gaia files and reboot your phone

PROFILE := $$($(ADB) shell ls -d /data/b2g/mozilla/*.default | tr -d '\r')
PROFILE_DATA := profile
.PHONY: install-gaia
install-gaia: 
	$(ADB) start-server
	$(ADB) shell rm -r /data/local/*
	@for i in $$(ls); do $(ADB) push $$i /data/local/$$i; done
	@echo 'Rebooting phone now'
	$(ADB) reboot

# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
.PHONY: delete-databases
delete-databases:
	$(ADB) shell rm -r /data/b2g/mozilla/*.default/indexedDB/*

# Take a screenshot of the device and put it in screenshot.png
.PHONY: screenshot
screenshot:
	mkdir screenshotdata
	adb pull /dev/graphics/fb0 screenshotdata/fb0 
	dd bs=1920 count=800 if=screenshotdata/fb0 of=screenshotdata/fb0b
	ffmpeg -vframes 1 -vcodec rawvideo -f rawvideo -pix_fmt rgb32 -s 480x800 -i screenshotdata/fb0b -f image2 -vcodec png screenshot.png
	rm -rf screenshotdata
