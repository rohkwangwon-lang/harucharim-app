// 프레임(JPEG) + 나레이션(WAV) → H.264/AAC MP4
// 사용: swift encode.swift <프레임 폴더> <wav> <출력.mp4> <fps> <폭> <높이> <영상 비트레이트>
import AVFoundation
import CoreImage
import ImageIO

let a = CommandLine.arguments
let frameDir = URL(fileURLWithPath: a[1]), wavURL = URL(fileURLWithPath: a[2]), outURL = URL(fileURLWithPath: a[3])
let fps = Int32(a[4])!, W = Int(a[5])!, H = Int(a[6])!, bitrate = Int(a[7])!
try? FileManager.default.removeItem(at: outURL)

let files = try FileManager.default.contentsOfDirectory(atPath: frameDir.path).filter { $0.hasSuffix(".jpg") }.sorted()
let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true  // moov 를 앞에 — 받자마자 재생이 시작된다

let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                    AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2, AVVideoExpectedSourceFrameRateKey: Int(fps)],
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2]
])
vIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
writer.add(vIn)

let aIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [
  AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 44100, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 96000])
aIn.expectsMediaDataInRealTime = false
writer.add(aIn)

let asset = AVURLAsset(url: wavURL)
let reader = try AVAssetReader(asset: asset)
let sem0 = DispatchSemaphore(value: 0)
var aTrack: AVAssetTrack!
asset.loadTracks(withMediaType: .audio) { t, _ in aTrack = t?.first; sem0.signal() }
sem0.wait()
let aOut = AVAssetReaderTrackOutput(track: aTrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false, AVSampleRateKey: 44100, AVNumberOfChannelsKey: 1])
reader.add(aOut)
reader.startReading()

writer.startWriting()
writer.startSession(atSourceTime: .zero)
let ctx = CIContext()
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let group = DispatchGroup()
var idx = 0

group.enter()
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "v")) {
  while vIn.isReadyForMoreMediaData {
    if idx >= files.count { vIn.markAsFinished(); group.leave(); return }
    autoreleasepool {
      let src = CGImageSourceCreateWithURL(frameDir.appendingPathComponent(files[idx]) as CFURL, nil)!
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
      var pb: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
      var ci = CIImage(cgImage: img)
      if img.width != W { let s = CGFloat(W) / CGFloat(img.width); ci = ci.transformed(by: CGAffineTransform(scaleX: s, y: s)) }
      ctx.render(ci, to: pb!, bounds: CGRect(x: 0, y: 0, width: W, height: H), colorSpace: cs)
      adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(idx), timescale: fps))
      if idx % 600 == 0 { print("  영상 \(idx)/\(files.count)") }
      idx += 1
    }
  }
}
group.enter()
aIn.requestMediaDataWhenReady(on: DispatchQueue(label: "a")) {
  while aIn.isReadyForMoreMediaData {
    if let sb = aOut.copyNextSampleBuffer() { aIn.append(sb) } else { aIn.markAsFinished(); group.leave(); return }
  }
}
group.wait()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
if writer.status != .completed { print("실패:", writer.error ?? "?"); exit(1) }
let size = (try FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as! NSNumber).intValue
print("완료 \(outURL.lastPathComponent) · \(files.count)장 · \(String(format: "%.1f", Double(size) / 1_048_576)) MB")
