SYS=$(shell uname -s)

ifeq ($(SYS),Darwin)
XULRUNNERSDK=../../xulrunner-sdk/bin/XUL.framework/Versions/Current/run-mozilla.sh
XPCSHELLSDK=../../xulrunner-sdk/bin/XUL.framework/Versions/Current/xpcshell
else ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
# For windows we only have one binary
XULRUNNERSDK=
XPCSHELLSDK=../../xulrunner-sdk/bin/xpcshell
else
# Otherwise, assume linux
XULRUNNERSDK=../../xulrunner-sdk/bin/run-mozilla.sh
XPCSHELLSDK=../../xulrunner-sdk/bin/xpcshell
endif

rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

SHARED_SOURCES := $(call rwildcard,shared/,*)
JS_SOURCES := $(call rwildcard,js/,*)
CSS_SOURCES := $(call rwildcard,style/,*.css)

.PHONY: all clean

all: update_shared built/mail_app.js built/mail.css

clean:
	rm -rf ./shared
	rm -rf ./built

update_shared: $(SHARED_SOURCES)
	@rm -rf ./shared
	@cp -rp ../../shared ./shared

built/mail_app.js: $(JS_SOURCES)
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/email.build.js

built/mail.css: $(CSS_SOURCES)
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o cssIn=style/mail.css out=built/mail.css cssPrefix=../style/
