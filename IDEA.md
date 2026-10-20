# The idea

- **Assigned idea:** Queue Together — a QR-based queue for a shared resource. The team chose table tennis and reframed it from a live queue to booking slots and finding players.
- **Who has the problem?** Students at 42 Heilbronn sharing two table tennis tables. Around ten players at peak; matches are best of 3 or 5 (15–30 min). Players often do not know each other.
- **What goes wrong today?** Nobody knows when a table is free or who is next, people stand around waiting, the same people stay on the tables, and someone who arrives alone has no partner.
- **What can they do by the end of the demo?** Scan the QR sticker on a table, see that table's 30-minute slots for today, book a slot for their group (singles = 2 spots, doubles = 4) or leave spots open, and join someone else's open game. Players are identified by their 42 intra login, shown as a link to their intra profile so others can find them.
- **What one task proves it helped?** jwosylu scans table 2's code and books 14:00 as singles with one spot open. ben42 opens `/table/2` on another phone, sees the open game and joins; the slot is now full. Anyone else trying table 2 at 14:00 is refused. When jwosylu reopens the page it shows "ben42 joined" with a link to his profile. After a redeploy everything is still there. Only jwosylu's phone can cancel the booking; only ben42's phone can take ben42 out of it.
- **What constraints matter today?**
  - Two tables, one QR code each (`/table/1`, `/table/2`), made with any free QR generator.
  - Today only, 30-minute slots, German time (Europe/Berlin, including DST). Default hours 09:00–18:00 in config.
  - No accounts. The login is typed, not verified. The right to cancel or leave belongs to the browser that made the booking or join.
  - Bookings live on the server outside the release directory (`~/.local/share/vibecode-workshop/data/`) so they survive a deploy.
  - Starter deploy contract: Node 22, port 3000, `/api/health`, tests must pass before deploy.
- **What are we deliberately leaving for later?** Admin page, real "Sign in with 42" or checking logins against the 42 API, the page updating by itself and notifications, fairness limits, booking more than a day ahead, a QR code shown in the app, and more tables or venues.
- **What remains an assumption that we need to test?**
  - People book a slot instead of just walking up to a free table.
  - Strangers actually join open games.
  - 30 minutes is the right slot length.
  - Typed logins without verification are good enough among students. Impersonation can't cancel someone's booking, only show a misleading name.
