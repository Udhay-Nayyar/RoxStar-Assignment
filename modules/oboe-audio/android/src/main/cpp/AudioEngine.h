#pragma once

#include <string>

#include "EchoEffect.h"
#include "OboeRecorder.h"

class AudioEngine {
 public:
  static AudioEngine& instance();

  std::string startRecording(const std::string& filePath);
  std::string stopRecording(std::string& outPath);
  std::string cancelRecording();
  void setEffect(const std::string& name);
  std::string getRecordingState() const;
  void onLifecyclePause();

 private:
  AudioEngine() = default;
  ~AudioEngine() = default;

  OboeRecorder recorder_;
  std::string activeEffect_ = "none";
};
