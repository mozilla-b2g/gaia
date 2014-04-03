include $(PWD)/build/common.mk

.PHONY: all clean
all: clean
	@echo Building findmydevice app to build_stage...
	@mkdir -p $(STAGE_APP_DIR)
	@cp -r * $(STAGE_APP_DIR)
	@$(call run-js-command,app/build)
clean:
	@rm -rf $(STAGE_APP_DIR)
