import UIKit
import Capacitor

@objc(TravelTools)
public final class TravelTools: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TravelTools"
    public let jsName = "TravelTools"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printTrip", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareText(_ call: CAPPluginCall) {
        guard let text = call.getString("text") else { call.reject("Missing itinerary"); return }
        DispatchQueue.main.async { self.presentShare(text, call: call) }
    }

    @objc func shareFile(_ call: CAPPluginCall) {
        guard let name = call.getString("name"),
              ["Roamfolio-trip.json", "Roamfolio-itinerary.ics", "Roamfolio-itinerary.txt"].contains(name),
              let contents = call.getString("contents") else {
            call.reject("Invalid export")
            return
        }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let file = folder.appendingPathComponent(name)
            try contents.write(to: file, atomically: true, encoding: .utf8)
            DispatchQueue.main.async { self.presentShare(file, call: call, cleanup: folder) }
        } catch {
            try? FileManager.default.removeItem(at: folder)
            call.reject("Could not create the export")
        }
    }

    private func presentShare(_ item: Any, call: CAPPluginCall, cleanup: URL? = nil) {
        guard let host = bridge?.viewController, host.presentedViewController == nil else {
            if let cleanup { try? FileManager.default.removeItem(at: cleanup) }
            call.reject("Another sheet is open")
            return
        }
        let sheet = UIActivityViewController(activityItems: [item], applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = host.view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: host.view.bounds.midX, y: host.view.bounds.midY, width: 1, height: 1)
        sheet.completionWithItemsHandler = { _, completed, _, error in
            if let cleanup { try? FileManager.default.removeItem(at: cleanup) }
            if let error { call.reject(error.localizedDescription) }
            else { call.resolve(["shared": completed]) }
        }
        host.present(sheet, animated: true)
    }

    @objc func printTrip(_ call: CAPPluginCall) {
        guard let text = call.getString("text") else { call.reject("Missing itinerary"); return }
        DispatchQueue.main.async {
            let printer = UIPrintInteractionController.shared
            printer.printFormatter = UISimpleTextPrintFormatter(text: text)
            printer.present(animated: true) { _, _, error in
                if let error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        }
    }
}

