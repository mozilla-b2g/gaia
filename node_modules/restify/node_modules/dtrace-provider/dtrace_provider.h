#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>

extern "C" {
#include <usdt.h>
}

#include <sys/dtrace.h>
#include <sys/types.h>
#include <sys/mman.h>

#include <errno.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>

#ifndef __APPLE__
#include <stdlib.h>
#include <malloc.h>
#endif

namespace node {

  using namespace v8;

  class DTraceArgument {
  public:
    virtual const char *Type() = 0;
    virtual void *ArgumentValue(Handle<Value>) = 0;
    virtual void FreeArgument(void *) = 0;
    virtual ~DTraceArgument() { };
  };

  class DTraceIntegerArgument : public DTraceArgument {
  public:
    const char *Type();
    void *ArgumentValue(Handle<Value>);
    void FreeArgument(void *);
  };

  class DTraceStringArgument : public DTraceArgument {
  public:
    const char *Type();
    void *ArgumentValue(Handle<Value>);
    void FreeArgument(void *);
  };

  class DTraceJsonArgument : public DTraceArgument {
  public:
    const char *Type();
    void *ArgumentValue(Handle<Value>);
    void FreeArgument(void *);
    DTraceJsonArgument();
    ~DTraceJsonArgument();
  private:
    Persistent<Object> JSON;
    Persistent<Function> JSON_stringify;
  };

  class DTraceProbe : ObjectWrap {

  public:
    static void Initialize(v8::Handle<v8::Object> target);
    usdt_probedef_t *probedef;
    size_t argc;
    DTraceArgument *arguments[USDT_ARG_MAX];

    static v8::Handle<v8::Value> New(const v8::Arguments& args);
    static v8::Handle<v8::Value> Fire(const v8::Arguments& args);

    Handle<Value> _fire(v8::Local<v8::Value>);

    static Persistent<FunctionTemplate> constructor_template;

    DTraceProbe();
    ~DTraceProbe();
  private:
  };

  class DTraceProvider : ObjectWrap {

  public:
    static void Initialize(v8::Handle<v8::Object> target);
    usdt_provider_t *provider;

    static v8::Handle<v8::Value> New(const v8::Arguments& args);
    static v8::Handle<v8::Value> AddProbe(const v8::Arguments& args);
    static v8::Handle<v8::Value> RemoveProbe(const v8::Arguments& args);
    static v8::Handle<v8::Value> Enable(const v8::Arguments& args);
    static v8::Handle<v8::Value> Disable(const v8::Arguments& args);
    static v8::Handle<v8::Value> Fire(const v8::Arguments& args);

    DTraceProvider();
    ~DTraceProvider();
  private:
    static Persistent<FunctionTemplate> constructor_template;
  };

  void InitDTraceProvider(v8::Handle<v8::Object> target);
}
