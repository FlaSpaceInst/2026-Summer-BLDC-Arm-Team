# ezrassor_controller

Mobile app to control the RE-RASSOR rover.

Visit the official Expo page: [https://expo.dev/@ezrassor/RERASSORController](https://expo.dev/@ezrassor/RERASSORController)

Table of contents:

- [Prereqs](#prereqs)
- [Setup](#setup)
- [Running](#running)
- [Contributing](#contributing)
- [License](#license)

---

## Prereqs


### For Development

1. You need to have the [EZ-RASSOR software](https://github.com/FlaSpaceInst/EZ-RASSOR-2.0), either set to run on an actual rover or on a Gazebo simulator.  Follow the instructions found on that repo to set it up.
1. Install [Node.js and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).  You can use a tool such as [nvm](https://github.com/nvm-sh/nvm) to manage Node.js and NPM versions.
1. Install [expo-cli](https://docs.expo.dev/get-started/installation/).
1. Install an Android Emultator and configure Expo to use it.  The easiest way to do so is to [install it via Android Studio](https://docs.expo.dev/workflow/android-studio-emulator/).
    - If you choose this route, then install [Android Studio](https://developer.android.com/studio/install#linux) on Linux.
1. To run the app on an actual Android device, install [Expo Go](https://expo.dev/client) on your phone.

---

## Setup

If not done already, clone this repo to its own folder:
```sh
git clone https://github.com/FlaSpaceInst/ezrassor_controller
```

Then, you will need install the Node.js dependencies for this project:
```sh
cd ezrassor_controller
npm install
```

---

## Running

Run the [EZ-RASSOR software](https://github.com/FlaSpaceInst/EZ-RASSOR-2.0), following instructions found on that repo as needed.

Next, to run `ezrassor_controller` for development, either in a simulation or on an actual Android device:
```sh
expo start
```

At this point if you have Expo Go downloaded on your Android device, you can simply scan the QR code that appears to load the application natively on your device. Alternatively, go to the official [RE-RASSOR Controller Expo Page](https://expo.dev/@ezrassor/RERASSORController).

---

## Contributing

For a basic rundown on how to contribute to this project using Git and GitHub, see the guide at [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).


---

## License

This software is released under the MIT license.  View the full license under [docs/LICENSE.txt](docs/LICENSE.txt).
