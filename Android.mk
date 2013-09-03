LOCAL_PATH:= $(call my-dir)

#
# Gaia glue
#

include $(CLEAR_VARS)
GAIA_PATH := $(abspath $(LOCAL_PATH))

LOCAL_MODULE := gaia
LOCAL_MODULE_CLASS := DATA
LOCAL_MODULE_TAGS := optional eng
LOCAL_SRC_FILES := profile.tar.gz
LOCAL_MODULE_PATH := $(TARGET_OUT_DATA)/local
include $(BUILD_PREBUILT)

# We will keep this flag in .b2g.mk so |./flash.sh gaia| follows
# will correctly pick up the flags.
GAIA_MAKE_FLAGS :=

GAIA_PROFILE_INSTALL_PARENT := $(TARGET_OUT_DATA)/local
GAIA_APP_INSTALL_PARENT := $(GAIA_PROFILE_INSTALL_PARENT)
CLEAN_PROFILE := 0

# In user (production) builds we put gaia apps in /system/b2g/webapps
ifneq ($(filter user userdebug, $(TARGET_BUILD_VARIANT)),)
GAIA_MAKE_FLAGS += PRODUCTION=1
B2G_SYSTEM_APPS := 1
endif

# Gaia currently needs to specify the default scale value manually or pictures
# with correct resolution will not be applied.
ifneq (,$(GAIA_DEV_PIXELS_PER_PX))
GAIA_MAKE_FLAGS += GAIA_DEV_PIXELS_PER_PX=$(GAIA_DEV_PIXELS_PER_PX)
endif

ifeq ($(B2G_SYSTEM_APPS),1)
GAIA_MAKE_FLAGS += B2G_SYSTEM_APPS=1
GAIA_APP_INSTALL_PARENT := $(TARGET_OUT)/b2g
CLEAN_PROFILE := 1
endif

GAIA_APP_INSTALL_PATH := $(GAIA_APP_INSTALL_PARENT)/webapps

$(LOCAL_INSTALLED_MODULE):
	@echo Gaia install path: $(GAIA_APP_INSTALL_PATH)
	mkdir -p $(GAIA_PROFILE_INSTALL_PARENT) $(GAIA_APP_INSTALL_PARENT)
	rm -rf $(GAIA_APP_INSTALL_PATH)
	@rm -rf $(GAIA_APP_INSTALL_PARENT)/svoperapps
	cd $(GAIA_PROFILE_INSTALL_PARENT) && tar xfz $(abspath $<)
	mkdir -p $(TARGET_OUT)/b2g
	cp $(GAIA_PATH)/profile/user.js $(TARGET_OUT)/b2g/user.js

ifneq ($(GAIA_PROFILE_INSTALL_PARENT), $(GAIA_APP_INSTALL_PARENT))
	mv $(GAIA_PROFILE_INSTALL_PARENT)/webapps $(GAIA_APP_INSTALL_PARENT)
endif

GAIA_TESTS_STAGE := $(GAIA_PATH)/tests-stage

.PHONY: gaia-tests-zip
gaia-tests-zip:
	rm -rf $(GAIA_TESTS_STAGE)
	mkdir -p $(GAIA_TESTS_STAGE)/gaiatest/gaiatest/atoms
	@(cd $(GAIA_PATH)/tests/python && tar -chf - *) | (cd $(GAIA_TESTS_STAGE)/gaiatest && tar -xf -)
	@(cd $(GAIA_PATH)/tests/atoms && tar -chf - *) | (cd $(GAIA_TESTS_STAGE)/gaiatest/gaiatest/atoms && tar -xf -)
	(cd $(GAIA_TESTS_STAGE) && zip -r $(GAIA_PATH)/gaia-tests.zip *)

.PHONY: $(LOCAL_PATH)/profile.tar.gz
$(LOCAL_PATH)/profile.tar.gz:
ifeq ($(CLEAN_PROFILE), 1)
	rm -rf $(GAIA_PATH)/profile $(GAIA_PATH)/profile.tar.gz
endif
	echo $(GAIA_MAKE_FLAGS) > $(GAIA_PATH)/.b2g.mk
	$(MAKE) -C $(GAIA_PATH) $(GAIA_MAKE_FLAGS) profile
	@FOLDERS='webapps'; \
	if [ -d $(GAIA_PATH)/profile/indexedDB ]; then \
	FOLDERS="indexedDB $${FOLDERS}"; \
	fi; \
	if [ -d $(GAIA_PATH)/profile/svoperapps ]; then \
	FOLDERS="svoperapps $${FOLDERS}"; \
	fi; \
	cd $(GAIA_PATH)/profile && tar cfz $(abspath $@) $${FOLDERS}; \
	if [ -d $(GAIA_PATH)/profile/indexedDB ]; then \
	rm -rf $(GAIA_PATH)/profile/indexedDB; \
	fi; \
	if [ -d $(GAIA_PATH)/profile/svoperapps ]; then \
	rm -rf $(GAIA_PATH)/profile/svoperapps; \
	fi
