APP_BUILD_DIR?=file:///$(shell pwd)/build/
ifneq (,$(findstring MINGW32_,$(SYS)))
	APP_BUILD_DIR := file:///$(shell sh -c 'pwd -W')/build/
endif

define run-app-js-command
  @$(XULRUNNERSDK) $(XPCSHELLSDK) \
    -e "const GAIA_BUILD_DIR='$(GAIA_BUILD_DIR)'" \
    -e "const APP_BUILD_DIR='$(APP_BUILD_DIR)'" \
    -f ../../build/xpcshell-commonjs.js \
    -e "try { require('app/$(strip $1)').execute($$BUILD_CONFIG); quit(0);} \
          catch(e) { \
            dump('Exception: ' + e + '\n' + e.stack + '\n'); \
          throw(e); \
        }"
endef
