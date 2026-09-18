#include <jni.h>

#include "AudioEngine.h"

#include <string>

namespace {

jstring toJString(JNIEnv *env, const std::string &value) {
    return env->NewStringUTF(value.c_str());
}

std::string fromJString(JNIEnv *env, jstring value) {
    if (!value) {
        return {};
    }
    const char *chars = env->GetStringUTFChars(value, nullptr);
    std::string result = chars ? chars : "";
    env->ReleaseStringUTFChars(value, chars);
    return result;
}

} // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_oboeaudio_OboeAudioModule_nativeStartRecording(JNIEnv *env, jobject /*thiz*/, jstring path) {
    const std::string error = AudioEngine::instance().startRecording(fromJString(env, path));
    return toJString(env, error);
}

extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_oboeaudio_OboeAudioModule_nativeStopRecording(JNIEnv *env, jobject /*thiz*/) {
    std::string outPath;
    const std::string error = AudioEngine::instance().stopRecording(outPath);
    if (!error.empty()) {
        return toJString(env, std::string("ERROR:") + error);
    }
    return toJString(env, outPath);
}

extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_oboeaudio_OboeAudioModule_nativeCancelRecording(JNIEnv *env, jobject /*thiz*/) {
    const std::string error = AudioEngine::instance().cancelRecording();
    return toJString(env, error);
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_oboeaudio_OboeAudioModule_nativeSetEffect(JNIEnv *env, jobject /*thiz*/, jstring name) {
    AudioEngine::instance().setEffect(fromJString(env, name));
}

extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_oboeaudio_OboeAudioModule_nativeGetRecordingState(JNIEnv *env, jobject /*thiz*/) {
    return toJString(env, AudioEngine::instance().getRecordingState());
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_oboeaudio_OboeAudioModule_nativeOnLifecyclePause(JNIEnv * /*env*/, jobject /*thiz*/) {
    AudioEngine::instance().onLifecyclePause();
}
