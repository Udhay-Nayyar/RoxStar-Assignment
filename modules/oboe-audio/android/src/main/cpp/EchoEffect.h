#pragma once

#include <string>
#include <vector>

class EchoEffect {
 public:
  static std::string apply(const std::string& inputPath, const std::string& outputPath);

 private:
  static std::vector<int16_t> readPcm16(const std::string& path);
  static void writePcm16(const std::string& path, const std::vector<int16_t>& samples);
};
