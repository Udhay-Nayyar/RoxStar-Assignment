import ExpoModulesCore

public class OboeAudioModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OboeAudio")

    AsyncFunction("startRecording") { () -> String in
      throw Exception("Oboe recording is Android-only")
    }

    AsyncFunction("stopRecording") { () -> String in
      throw Exception("Oboe recording is Android-only")
    }

    AsyncFunction("cancelRecording") { () in
      throw Exception("Oboe recording is Android-only")
    }

    Function("setEffect") { (_: String) in }

    Function("getRecordingState") { () -> String in
      "unavailable"
    }
  }
}
