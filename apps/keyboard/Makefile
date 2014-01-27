ifdef XPCSHELLSDK
	JS_RUN_ENVIRONMENT := $(XULRUNNERSDK) $(XPCSHELLSDK)
endif

ifndef GAIA_BUILD_DIR
	GAIA_BUILD_DIR=../../build
endif

BUILD_DIR=../../build_stage/keyboard

.PHONY: all clean
all: clean
	@mkdir -p $(BUILD_DIR)
	@$(XULRUNNERSDK) $(XPCSHELLSDK) \
	-e "const GAIA_BUILD_DIR='$(GAIA_BUILD_DIR)'" \
	-e "const APP_BUILD_DIR='$(GAIA_BUILD_DIR)../apps/keyboard/build/'" \
	-f ../../build/xpcshell-commonjs.js \
	-e "try { require('app/build').execute($$BUILD_CONFIG); quit(0);} \
    catch(e) { \
      dump('Exception: ' + e + '\n' + e.stack + '\n'); \
      throw(e); \
    }"

clean:
	rm -rf $(BUILD_DIR)
