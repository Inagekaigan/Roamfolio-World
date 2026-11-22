import Capacitor
import EventKit
import EventKitUI

extension TravelTools: EKEventEditViewDelegate {
    @objc func addEvent(_ call: CAPPluginCall) {
        guard let title = call.getString("title"),
              let local = call.getString("local"),
              let id = call.getString("zone"), let zone = TimeZone(identifier: id) else {
            call.reject("Set a destination time zone first")
            return
        }
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController, host.presentedViewController == nil else {
                call.reject("Another sheet is open")
                return
            }
            let format = DateFormatter()
            format.locale = Locale(identifier: "en_US_POSIX")
            format.calendar = Calendar(identifier: .gregorian)
            format.timeZone = zone
            format.dateFormat = "yyyy-MM-dd'T'HH:mm"
            guard let date = format.date(from: local), format.string(from: date) == local else {
                call.reject("Invalid local time")
                return
            }
            let store = EKEventStore()
            let editor = EKEventEditViewController()
            let event = EKEvent(eventStore: store)
            event.title = title
            event.location = call.getString("city")
            event.notes = call.getString("notes")
            event.startDate = date
            event.endDate = date.addingTimeInterval(3600)
            event.timeZone = zone
            editor.eventStore = store
            editor.event = event
            editor.editViewDelegate = self
            host.present(editor, animated: true) { call.resolve() }
        }
    }

    public func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true)
    }
}
