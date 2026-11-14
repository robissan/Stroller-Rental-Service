# Little Roam web demo

A static, single-page demo for Little Roam: a scroll-scrubbed stroller film, a shader background, and the Flying and Pop-up offers from the PRD. No build step and no package; it is not part of the pnpm workspace.

## View it

    cd artifacts/little-roam-web
    python3 -m http.server 8000

Then open http://localhost:8000. Opening `index.html` straight from disk also works.

## The film

`frames/f-000.webp` onward are the film, drawn to a canvas and cross-blended as you scroll. The `FILM` constant near the bottom of `index.html` holds the frame count and the four frame numbers where a chapter rests (front view, seat swivelled, folded, carrycot).

The frames checked in are stand-ins: a dissolve between four low-resolution keyframe stills. The three video clips (swivel, fold, pop-up) exist in Runway but are not cut in yet. To replace them, with the clips saved as `clip-1.mp4`, `clip-2.mp4`, `clip-3.mp4`:

    ./cut-frames.sh clip-1.mp4 clip-2.mp4 clip-3.mp4

It rewrites `frames/` and prints the `FILM` line to paste into `index.html`.

## Things to know

- Prices follow the PRD's pilot hypotheses (EUR 75 for 5 days, EUR 55 and EUR 85 a month). The Expo app in `artifacts/little-roam` uses different figures (EUR 12 a day, EUR 45 and EUR 79).
- The stroller is a generated, unbranded render. Little Roam is not affiliated with Bugaboo.
- The email form sends nothing.
