#include "EchoEffect.h"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>

namespace {
constexpr int kSampleRate = 44100;
constexpr int kEchoDelaySamples = static_cast<int>(kSampleRate * 0.30f);
constexpr float kEchoDecay = 0.4f;

std::vector<uint8_t> readFileBytes(const std::string& path) {
  std::ifstream input(path, std::ios::binary);
  if (!input.is_open()) {
    throw std::runtime_error("Unable to read input WAV file: " + path);
  }

  return std::vector<uint8_t>((std::istreambuf_iterator<char>(input)), std::istreambuf_iterator<char>());
}

uint16_t readU16LE(const std::vector<uint8_t>& bytes, size_t index) {
  return static_cast<uint16_t>(bytes[index]) |
         static_cast<uint16_t>(bytes[index + 1]) << 8;
}

uint32_t readU32LE(const std::vector<uint8_t>& bytes, size_t index) {
  return static_cast<uint32_t>(bytes[index]) |
         static_cast<uint32_t>(bytes[index + 1]) << 8 |
         static_cast<uint32_t>(bytes[index + 2]) << 16 |
         static_cast<uint32_t>(bytes[index + 3]) << 24;
}

std::vector<int16_t> extractSamples(const std::vector<uint8_t>& bytes) {
  const size_t dataOffset = 44;
  const size_t dataSize = static_cast<size_t>(readU32LE(bytes, 40));
  std::vector<int16_t> output;
  output.reserve(dataSize / 2);

  for (size_t i = 0; i + 1 < dataSize; i += 2) {
    const int16_t sample = static_cast<int16_t>(readU16LE(bytes, dataOffset + i));
    output.push_back(sample);
  }
  return output;
}

void writeWavFile(const std::string& outputPath, const std::vector<int16_t>& samples) {
  std::ofstream output(outputPath, std::ios::binary | std::ios::trunc);
  if (!output.is_open()) {
    throw std::runtime_error("Unable to write output WAV file: " + outputPath);
  }

  const uint32_t dataSize = static_cast<uint32_t>(samples.size() * sizeof(int16_t));
  const uint32_t riffSize = 36 + dataSize;
  const uint16_t bitsPerSample = 16;
  const uint16_t blockAlign = 2;
  const uint32_t byteRate = kSampleRate * blockAlign;

  output.write("RIFF", 4);
  output.write(reinterpret_cast<const char*>(&riffSize), 4);
  output.write("WAVE", 4);
  output.write("fmt ", 4);
  const uint32_t fmtSize = 16;
  output.write(reinterpret_cast<const char*>(&fmtSize), 4);
  const uint16_t audioFormat = 1;
  const uint16_t channels = 1;
  output.write(reinterpret_cast<const char*>(&audioFormat), 2);
  output.write(reinterpret_cast<const char*>(&channels), 2);
  output.write(reinterpret_cast<const char*>(&kSampleRate), 4);
  output.write(reinterpret_cast<const char*>(&byteRate), 4);
  output.write(reinterpret_cast<const char*>(&blockAlign), 2);
  output.write(reinterpret_cast<const char*>(&bitsPerSample), 2);
  output.write("data", 4);
  output.write(reinterpret_cast<const char*>(&dataSize), 4);

  for (const auto sample : samples) {
    const int16_t value = sample;
    output.write(reinterpret_cast<const char*>(&value), sizeof(value));
  }
}
}  // namespace

std::string EchoEffect::apply(const std::string& inputPath, const std::string& outputPath) {
  try {
    const auto rawBytes = readFileBytes(inputPath);
    if (rawBytes.size() < 44) {
      return "ERROR: Input file is not a valid WAV file";
    }

    std::vector<int16_t> samples = extractSamples(rawBytes);
    std::vector<int16_t> processed(samples.size(), 0);

    for (size_t i = 0; i < samples.size(); ++i) {
      const int delayedIndex = static_cast<int>(i - kEchoDelaySamples);
      float sample = static_cast<float>(samples[i]);
      if (delayedIndex >= 0) {
        sample += static_cast<float>(samples[delayedIndex]) * kEchoDecay;
      }
      processed[i] = static_cast<int16_t>(std::clamp(sample, -32768.0f, 32767.0f));
    }

    writeWavFile(outputPath, processed);
    return {};
  } catch (const std::exception& ex) {
    return std::string("ERROR:") + ex.what();
  }
}

std::vector<int16_t> EchoEffect::readPcm16(const std::string&) {
  return {};
}

void EchoEffect::writePcm16(const std::string&, const std::vector<int16_t>&) {
}
