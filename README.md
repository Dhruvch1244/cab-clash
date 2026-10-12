# Cab Clash (offline)

Quick-fire mini-games for bored passengers, played in person on one phone. No internet, no accounts, no servers.

- 2 players share one phone, each owns half the screen. First to 5 wins.
- 31 mini-games (reflex, maths, words, memory and trivia).

Forked from [vickky1802/cab-clash](https://github.com/vickky1802/cab-clash) with the online party mode removed and everything bundled locally.

## Playing offline

Everything the game needs (pages, scripts, fonts) is in this folder; nothing is loaded from the internet.

- **From a website (e.g. GitHub Pages):** open it once while online. A service worker saves every file, so afterwards it loads with no connection. Use "Add to Home Screen" to get an app icon.
- **From the files:** copy the folder to the device and open `index.html`, or serve it locally: `python3 -m http.server`.
