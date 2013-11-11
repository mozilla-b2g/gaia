# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=camera` from the root gaia directory.)
endif

rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

SHARED_SOURCES := $(call rwildcard,../../shared/,*)
JS_SOURCES := $(call rwildcard,js/,*)
LOCALES_SOURCES := $(call rwildcard,locales/,*)
RESOURCES_SOURCES := $(call rwildcard,resources/,*)
STYLE_SOURCES := $(call rwildcard,style/,*)
BUILD_SOURCES := $(call rwildcard,build/,*)

BUILD_DIR=../../build_stage/camera

.PHONY: all clean

all: $(BUILD_DIR)/js/main.js

clean:
	rm -rf $(BUILD_DIR)

$(BUILD_DIR)/js/main.js: manifest.webapp index.html $(SHARED_SOURCES) $(JS_SOURCES) $(LOCALES_SOURCES) $(RESOURCES_SOURCES) $(STYLE_SOURCES) $(BUILD_SOURCES)
	@rm -rf $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)
	cp -rp ../../shared $(BUILD_DIR)/shared
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/require_config.jslike
