# Roamfolio for iPhone

Open `Roamfolio.xcodeproj` on a Mac with Xcode 26 or newer. Xcode fetches the pinned Capacitor Swift package on the first build. Select the Roamfolio scheme and an iPhone simulator running iOS 17 or later, then press Run. The city atlas, planner and route map ship inside the app.

For a physical iPhone, select your team under Signing & Capabilities. Choose a bundle identifier you control if the default is unavailable. Connect the device, select it as the run destination and run the app.

## Bring in a trip

In the earlier planner, open Documents & notes and download a trip backup. On the phone, open More → Import trip backup and choose the JSON file. Each export contains one trip. Browser and native app storage are separate.

## Phone features

The bottom bar opens Journal, Days, Places, Wallet and More. Share itinerary sends a readable schedule to the system share sheet. Open a saved activity and tap Add saved activity to Apple Calendar to review the event, including its destination time zone. Adjust the proposed one-hour duration as needed. The Days view also exports the full schedule as an ICS file.

City photos, destination guides and extended online lookup require a connection. Saved trips, the offline directory, budgets and the route map remain available offline. This is an unsigned source project. Device signing, iPhone testing and App Store submission require Xcode and the appropriate Apple account.
