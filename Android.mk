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

.PHONY: gaia-prefs
gaia-prefs:
	mkdir -p $(GAIA_PATH)/profile/defaults/
	touch  $(GAIA_PATH)/profile/defaults/empty-gaia-profile

.PHONY: $(LOCAL_PATH)/profile.tar.gz
$(LOCAL_PATH)/profile.tar.gz: gaia-prefs
	touch $(GAIA_PATH)/profile.tar.gz
