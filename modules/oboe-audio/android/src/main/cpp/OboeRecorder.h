#pragma once

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

#include <oboe/Oboe.h>

class OboeRecorder : public oboe::AudioStreamDataCallback,
                     public oboe::AudioStreamErrorCallback {
 public:
  OboeRecorder();
  ~OboeRecorder() override;

  std::string startRecording(const std::string& filePath);
  std::string stopRecording(std::string& outPath);
  std::string cancelRecording();
  void onLifecyclePause();
  std::string getRecordingState() const;

 private:
  oboe::DataCallbackResult onAudioReady(oboe::AudioStream* audioStream,
                                       void* audioData,
                                       int32_t numFrames) override;
  void onErrorAfterClose(oboe::AudioStream* audioStream,
                        oboe::Result error) override;

  void ensureOutputFile();
  void writeWavHeader(std::ofstream& output, uint32_t dataSize) const;
  void resetState();

  std::mutex mutex_;
  std::atomic<bool> recording_{false};
  std::atomic<bool> cancelled_{false};
  std::atomic<bool> ready_{false};
  std::string filePath_;
  std::string recordingState_ = "idle";
  std::vector<uint8_t> pcmData_;
  std::shared_ptr<oboe::AudioStream> stream_;
};
