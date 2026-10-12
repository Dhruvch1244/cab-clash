# Cab Clash (offline, in person, with a class tracker)

Quick-fire two-player mini-games on one shared phone. The game itself never needs the internet;
a small tracker server collects only the final result of each battle for the teacher.

Forked from [vickky1802/cab-clash](https://github.com/vickky1802/cab-clash); the online party mode was removed.

## How a battle works

1. Scan the QR code on the admin screen (or open the server link).
2. The two players agree on one phone, then pick themselves in **Who's battling?** — or add themselves as a
   **New student** with name, class (SE1–SE5) and team (1–4). **Random pair** picks two players for you.
3. Lay the phone flat between you: Teal plays from the top half, Yellow from the bottom. First to 5 wins.
4. The **final winner** is shown and the result is saved on the phone, then sent to the tracker as soon as
   the phone can reach the server. Rounds are never uploaded, only `winner, loser, score, rounds, time`.

After the first visit the game loads and plays with no connection; queued results upload when the phone is back online.

## Admin screen

`http://<server>:9000/admin` — password `cd2026` (change with `ADMIN_PASSWORD`).

- QR code to the game (with **Show big** for a projector)
- **Lobby**: phones online now, who is picking and who is mid-battle, plus every joined student by class and team
- Standings for students, teams and classes, the current champion, the full battle log, CSV download, reset

## Run it

```bash
node server.js            # http://localhost:9000  (Node 16+, no npm install)
```

Env: `PORT` (9000), `ADMIN_PASSWORD` (cd2026), `DATA_DIR` (./data), `PUBLIC_URL` (link in the QR code).
Data lives in `DATA_DIR/players.json` and `DATA_DIR/results.jsonl`.

## Spin up on EC2

On an instance you already have (Amazon Linux, Ubuntu, Debian, RHEL):

```bash
git clone https://github.com/Dhruvch1244/cab-clash && cd cab-clash
sudo ./deploy/setup.sh                 # installs Node if needed, runs on port 9000 as a service, prints links
```

Then open inbound TCP 9000 in the instance's security group. Re-run `sudo ./deploy/setup.sh` after `git pull` to update;
data in `/var/lib/cab-clash` is kept. Options: `sudo PORT=9000 ADMIN_PASSWORD=cd2026 ./deploy/setup.sh`.

To create a brand-new instance instead, with the AWS CLI configured:

```bash
./deploy/launch-ec2.sh ap-south-1     # creates SG (port 9000 open) + t3.micro, prints the game and admin links
```

Or launch any Amazon Linux 2023 / Ubuntu instance by hand, open inbound TCP 9000 in its security group,
and paste `deploy/user-data.sh` into **Advanced details → User data**.

**Offline caching needs HTTPS.** Browsers only allow the offline cache (service worker) on `https://` or
`localhost`. Over plain `http://IP:9000` the game still plays without signal once the page is open, and results
still queue on the phone, but reopening the page with no connection needs HTTPS (e.g. a domain behind a TLS proxy).
