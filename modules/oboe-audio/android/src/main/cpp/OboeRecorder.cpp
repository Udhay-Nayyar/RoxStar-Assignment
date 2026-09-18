#include "OboeRecorder.h"

#include <fstream>
#include <iomanip>
#include <sstream>
#include <vector>

namespace {
constexpr int kSampleRate = 44100;
constexpr int kChannelCount = 1;
constexpr int kBitsPerSample = 16;
constexpr int kBytesPerSample = kBitsPerSample / 8;

uint32_t bytesToU32LE(const std::vector<uint8_t>& buffer, size_t offset) {
  return static_cast<uint32_t>(buffer[offset]) |
         static_cast<uint32_t>(buffer[offset + 1]) << 8 |
         static_cast<uint32_t>(buffer[offset + 2]) << 16 |
         static_cast<uint32_t>(buffer[offset + 3]) << 24;
}

void appendWavChunk(std::ofstream& output, const std::string& tag, const std::vector<uint8_t>& data) {
  const uint32_t size = static_cast<uint32_t>(data.size());
  output.write(tag.data(), 4);
  output.write(reinterpret_cast<const char*>(&size), sizeof(size));
  output.write(reinterpret_cast<const char*>(data.data()), static_cast<std::streamsize>(data.size()));
}

std::string lastErrorString(oboe::Result result) {
  return oboe::convertToText(result);
}
}  // namespace

OboeRecorder::OboeRecorder() = default;

OboeRecorder::~OboeRecorder() {
  onLifecyclePause();
}

std::string OboeRecorder::startRecording(const std::string& filePath) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (recording_.load()) {
    return "Recording already in progress";
  }

  filePath_ = filePath;
  cancelled_.store(false);
  ready_.store(false);
  pcmData_.clear();
  recordingState_ = "starting";

    auto builder = std::make_unique<oboe::AudioStreamBuilder>();
    builder->setDirection(oboe::Direction::Input)
      ->setChannelCount(kChannelCount)
      ->setSampleRate(kSampleRate)
      ->setFormat(oboe::AudioFormat::I16)
      ->setSharingMode(oboe::SharingMode::Shared)
      ->setPerformanceMode(oboe::PerformanceMode::None)
      ->setDataCallback(this)
      ->setErrorCallback(this);

    oboe::Result result = builder->openStream(stream_);
  if (result != oboe::Result::OK) {
    resetState();
    return "ERROR: Failed to open Oboe input stream: " + lastErrorString(result);
  }

  result = stream_->requestStart();
  if (result != oboe::Result::OK) {
    stream_->close();
    stream_.reset();
    resetState();
    return "ERROR: Failed to start Oboe input stream: " + lastErrorString(result);
  }

  recording_.store(true);
  recordingState_ = "recording";
  ready_.store(true);
  return {};
}

std::string OboeRecorder::stopRecording(std::string& outPath) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (!recording_.load()) {
    outPath = filePath_;
    return {};
  }

  if (stream_) {
    const oboe::Result stopResult = stream_->requestStop();
    if (stopResult != oboe::Result::OK) {
      return "ERROR: Failed to stop Oboe input stream: " + lastErrorString(stopResult);
    }
    stream_->close();
    stream_.reset();
  }

  if (filePath_.empty()) {
    resetState();
    return "ERROR: No output path available";
  }

  std::ofstream output(filePath_, std::ios::binary | std::ios::trunc);
  if (!output.is_open()) {
    resetState();
    return "ERROR: Unable to create WAV file at " + filePath_;
  }

  const uint32_t dataSize = static_cast<uint32_t>(pcmData_.size());
  const uint32_t fileSize = 36 + dataSize;
  const uint16_t blockAlign = kChannelCount * kBytesPerSample;
  const uint32_t byteRate = kSampleRate * blockAlign;

  char riffHeader[12] = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'A', 'V', 'E'};
  char fmtChunk[16] = {'f', 'm', 't', ' ', 16, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0};
  char dataChunk[8] = {'d', 'a', 't', 'a', 0, 0, 0, 0};

  const uint16_t audioFormat = 1;
  const uint16_t numChannels = kChannelCount;
  const uint32_t sampleRate = kSampleRate;
  const uint16_t bitsPerSample = kBitsPerSample;

  output.write(riffHeader, 12);
  output.write(reinterpret_cast<const char*>(&fileSize), 4);
  output.write("WAVE", 4);
  output.write("fmt ", 4);
  output.write(reinterpret_cast<const char*>(&audioFormat), 2);
  output.write(reinterpret_cast<const char*>(&numChannels), 2);
  output.write(reinterpret_cast<const char*>(&sampleRate), 4);
  output.write(reinterpret_cast<const char*>(&byteRate), 4);
  output.write(reinterpret_cast<const char*>(&blockAlign), 2);
  output.write(reinterpret_cast<const char*>(&bitsPerSample), 2);
  output.write("data", 4);
  output.write(reinterpret_cast<const char*>(&dataSize), 4);
  output.write(reinterpret_cast<const char*>(pcmData_.data()), static_cast<std::streamsize>(pcmData_.size()));

  output.close();
  outPath = filePath_;
  resetState();
  return {};
}

std::string OboeRecorder::cancelRecording() {
  std::lock_guard<std::mutex> lock(mutex_);
  cancelled_.store(true);
  if (stream_) {
    stream_->requestStop();
    stream_->close();
    stream_.reset();
  }
  resetState();
  return {};
}

void OboeRecorder::onLifecyclePause() {
  std::lock_guard<std::mutex> lock(mutex_);
  if (stream_) {
    stream_->requestStop();
    stream_->close();
    stream_.reset();
  }
  if (recording_.load()) {
    resetState();
  }
}

std::string OboeRecorder::getRecordingState() const {
  return recordingState_;
}

oboe::DataCallbackResult OboeRecorder::onAudioReady(oboe::AudioStream* audioStream,
                                                   void* audioData,
                                                   int32_t numFrames) {
  if (!audioData || !recording_.load()) {
    return oboe::DataCallbackResult::Continue;
  }

  auto* pcm = static_cast<int16_t*>(audioData);
  const int32_t sampleCount = numFrames * audioStream->getChannelCount();
  for (int32_t i = 0; i < sampleCount; ++i) {
    const int16_t sample = pcm[i];
    const uint8_t low = static_cast<uint8_t>(sample & 0xFF);
    const uint8_t high = static_cast<uint8_t>((sample >> 8) & 0xFF);
    pcmData_.push_back(low);
    pcmData_.push_back(high);
  }
  return oboe::DataCallbackResult::Continue;
}

void OboeRecorder::onErrorAfterClose(oboe::AudioStream* /*audioStream*/, oboe::Result error) {
  std::lock_guard<std::mutex> lock(mutex_);
  recordingState_ = "error";
  recording_.store(false);
  if (error != oboe::Result::OK) {
    pcmData_.clear();
  }
}

void OboeRecorder::resetState() {
  recording_.store(false);
  cancelled_.store(false);
  ready_.store(false);
  recordingState_ = "idle";
  if (stream_) {
    stream_->close();
    stream_.reset();
  }
}
