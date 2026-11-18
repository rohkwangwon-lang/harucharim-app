import UIKit
import AVFoundation
import Capacitor
import VisionKit

/**
 * 하루차림 바코드 인식 — 아이폰 자체 '라이브 텍스트' 인식기(VisionKit DataScannerViewController)를 띄운다.
 *
 * 2026-11-18: @capacitor/barcode-scanner(OSBarcodeLib 3.0.1)가 실제 아이폰(17 Pro Max, iOS 27.2)에서
 * 카메라는 켜지는데(초록 점) 화면이 까맣게 나왔다. 애플이 직접 만든 인식기로 바꾼다.
 * iOS 16 미만이거나 기기가 지원하지 않으면 'UNSUPPORTED' 를 돌려주고, 웹 쪽(lib/native.ts)이 예전 플러그인으로 넘긴다.
 */
class HaruBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HaruScannerPlugin())
    }
}

@objc(HaruScannerPlugin)
public class HaruScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HaruScannerPlugin"
    public let jsName = "HaruScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    /// 화면이 떠 있는 동안 붙잡아 둔다(대리자가 약한 참조라 놓치면 바로 사라진다)
    private var active: AnyObject?

    @objc func scan(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("이 아이폰에서는 지원하지 않습니다", "UNSUPPORTED")
            return
        }
        let instructions = call.getString("instructions") ?? ""
        DispatchQueue.main.async {
            guard DataScannerViewController.isSupported else {
                call.reject("이 아이폰에서는 지원하지 않습니다", "UNSUPPORTED")
                return
            }
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    guard granted, DataScannerViewController.isAvailable else {
                        call.reject("카메라를 쓸 수 없습니다", "DENIED")
                        return
                    }
                    guard let presenter = self.bridge?.viewController else {
                        call.reject("화면을 열 수 없습니다", "ERROR")
                        return
                    }
                    let session = HaruScanSession(instructions: instructions) { [weak self] result in
                        switch result {
                        case .success(let code): call.resolve(["code": code])
                        case .failure(let err): call.reject(err.message, err.code)
                        }
                        self?.active = nil
                    }
                    self.active = session
                    session.present(from: presenter)
                }
            }
        }
    }
}

struct HaruScanError: Error {
    let code: String
    let message: String
}

@available(iOS 16.0, *)
final class HaruScanSession: NSObject, DataScannerViewControllerDelegate {
    private let instructions: String
    private var done: ((Result<String, HaruScanError>) -> Void)?
    private var scanner: DataScannerViewController?
    private var container: UIViewController?

    init(instructions: String, done: @escaping (Result<String, HaruScanError>) -> Void) {
        self.instructions = instructions
        self.done = done
    }

    func present(from presenter: UIViewController) {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean13, .ean8, .upce, .code128, .itf14])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        scanner.delegate = self
        self.scanner = scanner

        /*
         * 인식기를 바깥 화면(container) 안에 넣고, 닫기 단추와 안내는 바깥 화면에 얹는다.
         * 2026-11-18 인식기 자체의 overlayContainerView 에 얹었을 때 실제 아이폰에서 X 가 눌리지 않았다.
         */
        let container = UIViewController()
        container.view.backgroundColor = .black
        container.modalPresentationStyle = .fullScreen
        container.addChild(scanner)
        scanner.view.frame = container.view.bounds
        scanner.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.view.addSubview(scanner.view)
        scanner.didMove(toParent: container)
        addOverlay(to: container.view)
        self.container = container

        presenter.present(container, animated: true) {
            do {
                try scanner.startScanning()
            } catch {
                self.finish(.failure(HaruScanError(code: "ERROR", message: "카메라를 시작하지 못했습니다")))
            }
        }
    }

    private func addOverlay(to overlay: UIView) {
        let close = UIButton(type: .system)
        close.setImage(UIImage(systemName: "xmark", withConfiguration: UIImage.SymbolConfiguration(pointSize: 20, weight: .semibold)), for: .normal)
        close.tintColor = .white
        close.backgroundColor = UIColor.black.withAlphaComponent(0.45)
        close.layer.cornerRadius = 22
        close.accessibilityLabel = "닫기"
        close.translatesAutoresizingMaskIntoConstraints = false
        close.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

        let label = UILabel()
        label.text = instructions
        label.textColor = .white
        label.font = .systemFont(ofSize: 17, weight: .semibold)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.backgroundColor = UIColor.black.withAlphaComponent(0.45)
        label.layer.cornerRadius = 12
        label.clipsToBounds = true
        label.isHidden = instructions.isEmpty
        label.isUserInteractionEnabled = false
        label.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(label)
        overlay.addSubview(close)

        let guide = overlay.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            close.topAnchor.constraint(equalTo: guide.topAnchor, constant: 12),
            close.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -16),
            close.widthAnchor.constraint(equalToConstant: 44),
            close.heightAnchor.constraint(equalToConstant: 44),
            label.bottomAnchor.constraint(equalTo: guide.bottomAnchor, constant: -32),
            label.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -24),
            label.heightAnchor.constraint(greaterThanOrEqualToConstant: 48)
        ])
    }

    @objc private func cancelTapped() {
        finish(.failure(HaruScanError(code: "CANCELLED", message: "닫았습니다")))
    }

    private func take(_ items: [RecognizedItem]) {
        for item in items {
            if case .barcode(let barcode) = item, let value = barcode.payloadStringValue, !value.isEmpty {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                finish(.success(value))
                return
            }
        }
    }

    func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
        take(addedItems)
    }

    func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
        take([item])
    }

    func dataScanner(_ dataScanner: DataScannerViewController, becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) {
        finish(.failure(HaruScanError(code: "DENIED", message: "카메라를 쓸 수 없습니다")))
    }

    private func finish(_ result: Result<String, HaruScanError>) {
        guard let done = self.done else { return }
        self.done = nil
        let scanner = self.scanner
        let container = self.container
        self.scanner = nil
        self.container = nil
        scanner?.stopScanning()
        if let container = container, container.presentingViewController != nil {
            container.dismiss(animated: true) { done(result) }
        } else {
            done(result)
        }
    }
}
