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

$(LOCAL_INSTALLED_MODULE):
	@echo Install dir: $(TARGET_OUT_DATA)/local
	rm -rf $(TARGET_OUT_DATA)/local/webapps
	mkdir -p $(TARGET_OUT_DATA)/local
	cd $(TARGET_OUT_DATA)/local && tar xfz $(abspath $<)

.PHONY: $(LOCAL_PATH)/profile.tar.gz
$(LOCAL_PATH)/profile.tar.gz:
	$(MAKE) -C $(GAIA_PATH) profile
	cd $(GAIA_PATH)/profile && tar cfz $(abspath $@) webapps user.js permissions.sqlite

