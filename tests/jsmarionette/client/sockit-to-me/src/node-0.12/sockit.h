#ifndef __SOCKIT_H__
#define __SOCKIT_H__

#include <node.h>
#include <node_object_wrap.h>

class Sockit : public node::ObjectWrap {
public:
  static void Init(v8::Handle<v8::Object>);

private:
  Sockit();
  ~Sockit();

  static v8::Persistent<v8::Function> constructor;

  static void New(const v8::FunctionCallbackInfo<v8::Value>&);

  static void Connect(const v8::FunctionCallbackInfo<v8::Value>&);

  static void Read(const v8::FunctionCallbackInfo<v8::Value>&);

  static void Write(const v8::FunctionCallbackInfo<v8::Value>&);

  int Write(const char *, const int);

  static void Close(const v8::FunctionCallbackInfo<v8::Value>&);

  static void SetPollTimeout(const v8::FunctionCallbackInfo<v8::Value>&);
  static void SetDebugLog(const v8::FunctionCallbackInfo<v8::Value>&);

  int mSocket;
  int mPollTimeout;

  bool mIsConnecting;
  bool mIsConnected;
};

#endif
