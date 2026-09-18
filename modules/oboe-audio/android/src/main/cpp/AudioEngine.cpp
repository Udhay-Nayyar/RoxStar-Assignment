#include "AudioEngine.h"

#include <utility>

AudioEngine& AudioEngine::instance() {
  static AudioEngine engine;
  return engine;
}

std::string AudioEngine::startRecording(const std::string& filePath) {
  return recorder_.startRecording(filePath);
}

std::string AudioEngine::stopRecording(std::string& outPath) {
  return recorder_.stopRecording(outPath);
}

std::string AudioEngine::cancelRecording() {
  return recorder_.cancelRecording();
}

void AudioEngine::setEffect(const std::string& name) {
  activeEffect_ = name;
}

std::string AudioEngine::getRecordingState() const {
  return recorder_.getRecordingState();
}

void AudioEngine::onLifecyclePause() {
  recorder_.onLifecyclePause();
}
