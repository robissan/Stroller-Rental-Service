# Little Roam web demo

A static web demo of Little Roam built to PRD v2: the landing page, the full Flying Solutions flow (check, book, receive, return), a Pop-up Solutions flow marked as paused, and a back office. No build step and no package; it is not part of the pnpm workspace. It uses the Expo app's tokens (colours from `constants/colors.ts`, Fraunces and DM Sans, 18px radius, rust buttons, pine and sage cards, sky and marigold pills).

Everything is simulated. Bookings are saved in the browser's local storage on one device. No card is taken, no email is sent and no stroller moves.

## View it

    cd artifacts/little-roam-web
    python3 -m http.server 8000

Then open http://localhost:8000.

| Screen | Address |
|---|---|
| Landing page | `/` |
| Book a trip (Flying) | `#flying` |
| Monthly plan (Pop-up) | `#popup` |
| My bookings | `#trips` |
| Back office | `#ops` |

## Files

- `index.html`: landing page and the scroll film.
- `js/roam.js`: every price and policy rule from the PRD, with no DOM. Change a rule here.
- `js/app.js`, `css/app.css`: the booking, plan and back-office screens.
- `js/vendor/qrcode.js`: QR code generator (MIT, Kazuhiko Arase).
- `tests/`: rule tests, browser tests, screenshots and `PRD-COVERAGE.md`.

## Tests

    node --test tests/rules.test.js
    pip install pytest playwright && playwright install chromium
    pytest tests/test_flows.py

The browser tests retake every screenshot in `tests/screenshots/`. `tests/PRD-COVERAGE.md` maps each PRD acceptance criterion to its test and screenshot, and lists what is simulated or not built.

## The film

`frames/f-000.webp` onward are the film, drawn to a canvas and cross-blended as you scroll. The `FILM` constant near the bottom of `index.html` holds the frame count and the four frame numbers where a chapter rests (front view, seat swivelled, folded, carrycot).

The frames checked in are stand-ins: a dissolve between four low-resolution keyframe stills. The three video clips (swivel, fold, pop-up) exist in Runway but are not cut in yet. To replace them, with the clips saved as `clip-1.mp4`, `clip-2.mp4`, `clip-3.mp4`:

    ./cut-frames.sh clip-1.mp4 clip-2.mp4 clip-3.mp4

It rewrites `frames/`, runs `recolor.py` to swap the renders' lilac studio backdrop for the app's cream, and prints the `FILM` line to paste into `index.html`. Needs ffmpeg, plus python3 with Pillow and numpy.

## Things to know

- Prices follow PRD v2: EUR 15 a day (EUR 75 for 5 days), EUR 10 per accessory, EUR 150 card hold. The Expo app in `artifacts/little-roam` uses different figures.
- Values the PRD doesn't define (zone postcodes, model specs, damage price list, replacement cost) are marked `PLACEHOLDER` in `js/roam.js`.
- The stroller is a generated, unbranded render.
