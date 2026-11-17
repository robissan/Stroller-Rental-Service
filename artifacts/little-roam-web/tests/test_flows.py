"""Browser tests for the Little Roam web demo, one per PRD v2 user story, and they take the screenshots.

Run from artifacts/little-roam-web:
    pip install pytest playwright && playwright install chromium
    pytest tests/test_flows.py
Set CHROME_PATH to use an installed Chrome instead of Playwright's Chromium.
Screenshots land in tests/screenshots/. The clock is fixed at Monday 1 March 2027, 10:00.
"""
import functools
import http.server
import os
import pathlib
import threading
import time

import pytest
from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "tests" / "screenshots"
NOW = "2027-03-01T10:00:00"
PHONE = {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2, "locale": "en-GB"}
DESK = {"viewport": {"width": 1280, "height": 900}, "device_scale_factor": 1, "locale": "en-GB"}


@pytest.fixture(scope="session")
def base():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}/index.html"
    srv.shutdown()


@pytest.fixture(scope="session")
def browser():
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        exe = os.environ.get("CHROME_PATH")
        b = p.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe else p.chromium.launch()
        yield b
        b.close()


def new_page(browser, size):
    ctx = browser.new_context(**size)
    ctx.add_init_script(f"window.__ROAM_NOW = '{NOW}';")
    page = ctx.new_page()
    page.errors = []
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
    return page


@pytest.fixture
def page(browser):
    p = new_page(browser, PHONE)
    yield p
    assert p.errors == [], f"console errors: {p.errors}"
    p.context.close()


@pytest.fixture
def desk(browser):
    p = new_page(browser, DESK)
    yield p
    assert p.errors == [], f"console errors: {p.errors}"
    p.context.close()


def shot(page, name, full=True):
    page.wait_for_timeout(150)
    page.screenshot(path=str(SHOTS / f"{name}.jpg"), type="jpeg", quality=60, full_page=full)


def set_now(page, iso):
    page.evaluate("t => { window.__ROAM_NOW = t; }", iso)


def db(page, expr):
    return page.evaluate(f"(() => {{ const db = RoamApp.db; return {expr}; }})()")


def check(page, postcode="08008", start="2027-03-15", end="2027-03-19", age="18", method="delivery"):
    if method == "pickup":
        page.locator("#app").get_by_label("I'll pick it up").check()
    else:
        page.locator("#app").get_by_label("Address").fill("Carrer de Mallorca 250")
        page.locator("#app").get_by_label("Postcode").fill(postcode)
    page.locator("#app").get_by_label("First day").fill(start)
    page.locator("#app").get_by_label("Last day").fill(end)
    page.locator("#app").get_by_label("Child's age").select_option(age)
    page.get_by_role("button", name="Check availability").click()


def book(page, base, accessories=(), **kw):
    """Whole parent flow from the landing page to a paid booking. Returns the booking id."""
    page.goto(base + "#flying")
    check(page, **kw)
    page.get_by_role("button", name="Continue").click()
    for a in accessories:
        page.locator("#app").get_by_label(a).check()
    page.locator("#app").get_by_label("Name").fill("Ana Ruiz")
    page.locator("#app").get_by_label("Email").fill("ana@example.com")
    page.locator("#app").get_by_label("Phone").fill("+34 600 111 222")
    page.get_by_role("button", name="Review price").click()
    page.get_by_role("button", name="Pay €").click()
    page.wait_for_selector("[data-booking]")
    return page.locator("[data-booking]").get_attribute("data-booking")


def seed_full(page, n=10):
    page.evaluate("""n => { for (let i = 0; i < n; i++) Roam.createBooking(RoamApp.db, { method: 'pickup', start: '2027-03-15', end: '2027-03-19',
        ageMonths: 18, name: 'Seed ' + i, email: 'seed@example.com', phone: '600000000' }, new Date(window.__ROAM_NOW)); RoamApp.save(); }""", n)


def job(desk, booking_id):
    return desk.locator(f'[data-job="{booking_id}"]')


def to_handed_over(desk, bid):
    """Operator flow in the back office: confirm, inspect, dispatch, record handoff."""
    job(desk, bid).get_by_role("button", name="Confirm").click()
    job(desk, bid).get_by_role("button", name="Inspect").click()
    job(desk, bid).get_by_role("button", name="Dispatch").click()
    job(desk, bid).get_by_role("button", name="Record handoff").click()


# ---------------------------------------------------------------- landing

def test_landing_matches_prd_v2(desk, base):
    """PRD: Little Roam everywhere, no brand claims; €15 a day; €150 hold; Pop-up paused; web booking."""
    desk.goto(base)
    text = desk.locator("#landing").inner_text()
    assert "Bugaboo" not in text
    assert "€15" in desk.locator("#prices").inner_text() and "5 days is €75" in desk.locator("#prices").inner_text()
    assert "€150 card hold" in desk.locator("#prices").inner_text()
    assert desk.locator("#prices .tag", has_text="Paused in the pilot").count() == 2
    expect(desk.locator(".steps li")).to_have_count(4)
    assert [li.locator("b").inner_text() for li in desk.locator(".steps li").all()] == ["Check", "Book", "Receive", "Return"]
    shot(desk, "00-landing-hero", full=False)
    desk.locator("#prices").scroll_into_view_if_needed()
    desk.locator("#prices").screenshot(path=str(SHOTS / "00-landing-prices.jpg"), type="jpeg", quality=60)
    desk.locator("#prices").get_by_role("link", name="Check your dates").click()
    expect(desk.get_by_role("heading", name="Check your trip")).to_be_visible()
    expect(desk.locator("#landing")).to_be_hidden()


# ---------------------------------------------------------------- story 1

def test_story1_served_address_and_dates_show_yes_on_one_screen(page, base):
    page.goto(base + "#flying")
    check(page)
    expect(page.locator('[data-result="yes"]')).to_contain_text("Yes, we can deliver to 08008")
    expect(page.locator('[data-result="yes"]')).to_contain_text("5 days, €75")
    assert page.url.endswith("#flying"), "the answer appears on the same screen"
    expect(page.get_by_role("heading", name="Check your trip")).to_be_visible()
    assert db(page, "db.searches.at(-1).result") == "available"
    shot(page, "s1-check-yes")


def test_story1_out_of_zone_shows_no_offers_waitlist_and_logs_denied_demand(page, base):
    page.goto(base + "#flying")
    check(page, postcode="08901")
    no = page.locator('[data-result="no"]')
    expect(no).to_contain_text("We don't deliver to 08901 yet")
    expect(page.get_by_role("button", name="Continue")).to_have_count(0)
    assert db(page, "db.searches.at(-1).result") == "denied_zone"
    no.get_by_label("Email for the waitlist").fill("ana@example.com")
    no.get_by_role("button", name="Join the waitlist").click()
    expect(page.locator('[data-waitlist="done"]')).to_contain_text("You're on the waitlist")
    assert db(page, "db.waitlist.length") == 1 and db(page, "db.waitlist[0].reason") == "zone"
    shot(page, "s1-check-no-zone-waitlist")


def test_story1_no_unit_free_shows_not_available_and_logs_denied_demand(page, base):
    page.goto(base + "#flying")
    seed_full(page)
    check(page)
    expect(page.locator('[data-result="no"]')).to_contain_text("No stroller is free for those dates")
    expect(page.locator("#app").get_by_label("Email for the waitlist")).to_be_visible()
    assert db(page, "db.searches.at(-1).result") == "denied_full"
    shot(page, "s1-check-no-units")


def test_story1_dates_outside_3_to_14_days_are_rejected_with_a_reason(page, base):
    page.goto(base + "#flying")
    check(page, end="2027-03-16")
    expect(page.locator("#start-err")).to_have_text("Rentals are 3 days or longer.")
    assert db(page, "db.searches.length") == 0
    shot(page, "s1-check-date-error")


# ---------------------------------------------------------------- story 2

def test_story2_model_range_folded_size_and_photos_show_before_booking(page, base):
    page.goto(base + "#flying")
    check(page)
    model = page.locator("#model")
    for needle in ["Wren", "6 months to 4 years", "Up to 22 kg", "52 × 44 × 25 cm"]:
        expect(model).to_contain_text(needle)
    expect(model.locator("img")).to_have_count(3)
    for img in model.locator("img").all():
        img.scroll_into_view_if_needed()
        expect(img).to_have_js_property("complete", True)
        assert img.evaluate("i => i.naturalWidth") > 0 and img.get_attribute("alt")
    model.screenshot(path=str(SHOTS / "s2-model-fit.jpg"), type="jpeg", quality=60)


def test_story2_child_outside_the_range_cannot_proceed(page, base):
    page.goto(base + "#flying")
    check(page, age="3")
    expect(page.locator('[data-reason="fit"]')).to_contain_text("doesn't fit babies under 6 months")
    expect(page.get_by_role("button", name="Continue")).to_have_count(0)
    check(page, age="60")
    expect(page.locator('[data-reason="fit"]')).to_contain_text("up to their 4th birthday")
    expect(page.get_by_role("button", name="Continue")).to_have_count(0)
    shot(page, "s2-child-outside-range")


# ---------------------------------------------------------------- story 3

def test_story3_only_compatible_accessories_offered_each_priced_separately(page, base):
    page.goto(base + "#flying")
    check(page)
    page.get_by_role("button", name="Continue").click()
    offered = page.locator('input[name="acc"]')
    assert [i.get_attribute("value") for i in offered.all()] == ["rain", "net"]
    assert "Footmuff" not in page.locator("#app").inner_text()
    assert page.locator(".choice .amt").all_inner_texts() == ["+€10", "+€10"]
    page.locator("#app").get_by_label("Rain cover").check()
    shot(page, "s3-accessories")


# ---------------------------------------------------------------- story 4

def test_story4_one_summary_with_full_price_and_terms_and_nothing_added_after(page, base):
    page.goto(base + "#flying")
    check(page, end="2027-03-21")                       # 7 days
    page.get_by_role("button", name="Continue").click()
    page.locator("#app").get_by_label("Rain cover").check()
    page.locator("#app").get_by_label("Mosquito net").check()
    page.locator("#app").get_by_label("Name").fill("Ana Ruiz")
    page.locator("#app").get_by_label("Email").fill("ana@example.com")
    page.locator("#app").get_by_label("Phone").fill("+34 600 111 222")
    page.get_by_role("button", name="Review price").click()
    summary = page.locator("#summary")
    for needle in ["7 days at €15 a day", "€105", "Rain cover", "Mosquito net", "Delivery and collection in zone", "Included", "Total to pay now", "€125", "Card hold, not charged", "€150"]:
        expect(summary).to_contain_text(needle)
    terms = page.locator(".terms")
    for needle in ["Free until 48 hours before handoff", "50% back after that", "Normal wear is free", "wheel €35", "€15 for each extra day"]:
        expect(terms).to_contain_text(needle)
    shot(page, "s4-summary-and-terms")
    page.get_by_role("button", name="Pay €125").click()
    page.wait_for_selector("[data-booking]")
    assert db(page, "db.bookings[0].money.charged") == 125, "the amount charged is the total on the summary"
    expect(page.locator("[data-net]")).to_have_text("€125")


# ---------------------------------------------------------------- story 5

def test_story5_book_with_only_the_needed_fields_then_confirmation_with_handoff_details(page, base):
    page.goto(base + "#flying")
    asked = set()
    grab = "() => [...document.querySelectorAll('#app input, #app select')].map(e => e.name)"
    t0 = time.monotonic()
    check(page)
    asked.update(page.evaluate(grab))
    page.get_by_role("button", name="Continue").click()
    asked.update(page.evaluate(grab))
    page.locator("#app").get_by_label("Name").fill("Ana Ruiz")
    page.locator("#app").get_by_label("Email").fill("ana@example.com")
    page.locator("#app").get_by_label("Phone").fill("+34 600 111 222")
    shot(page, "s5-your-details")
    page.get_by_role("button", name="Review price").click()
    asked.update(page.evaluate(grab))
    page.get_by_role("button", name="Pay €75").click()
    page.wait_for_selector("#confirmed")
    took = time.monotonic() - t0
    personal = asked - {"method", "acc", "hw", "cw"}               # choices, not personal data
    assert personal == {"address", "postcode", "start", "end", "age", "name", "email", "phone"}
    assert took < 180, f"scripted booking took {took:.1f}s"
    assert page.locator("#app form input").count() == 0, "no card fields: payment is simulated"
    mail = page.locator("#mail")
    for needle in ["ana@example.com", "Mon 15 Mar, 10:00 to 12:00", "Carrer de Mallorca 250, 08008", "Fri 19 Mar", "Paid €75", "Change or cancel this booking"]:
        expect(mail).to_contain_text(needle)
    assert db(page, "(new Date(db.bookings[0].createdAt) - new Date(window.__ROAM_NOW)) / 60000") < 5
    expect(page.locator("#confirmed")).to_contain_text("We confirm within 2 working hours")
    shot(page, "s5-confirmation")


def test_story5_missing_details_are_explained_field_by_field(page, base):
    page.goto(base + "#flying")
    check(page)
    page.get_by_role("button", name="Continue").click()
    page.locator("#app").get_by_label("Email").fill("ana")
    page.get_by_role("button", name="Review price").click()
    expect(page.locator("#name-err")).to_have_text("Enter your name.")
    expect(page.locator("#email-err")).to_contain_text("like you@example.com")
    expect(page.locator("#phone-err")).to_be_visible()
    expect(page.get_by_role("heading", name="Your booking")).to_be_visible()


# ---------------------------------------------------------------- story 6

def test_story6_change_dates_from_the_confirmation_link(page, base):
    bid = book(page, base)
    page.locator("#mail").get_by_role("link", name="Change or cancel this booking").click()
    page.get_by_role("button", name="Change dates").click()
    page.locator("#app").get_by_label("First day").fill("2027-03-20")
    page.locator("#app").get_by_label("Last day").fill("2027-03-26")
    shot(page, "s6-change-dates")
    page.get_by_role("button", name="Save new dates").click()
    expect(page.locator(".flash")).to_have_text("Dates changed. €30 charged.")
    expect(page.locator("#handoff")).to_contain_text("Sat 20 Mar")
    assert db(page, f"Roam.booking(db, '{bid}').money.charged") == 105
    page.get_by_role("button", name="Change dates").click()
    page.locator("#app").get_by_label("Last day").fill("2027-03-21")
    page.get_by_role("button", name="Save new dates").click()
    expect(page.locator("#start-err")).to_have_text("Rentals are 3 days or longer.")


def test_story6_cancel_applies_the_refund_rule_automatically(page, base):
    bid = book(page, base, accessories=["Rain cover"])
    page.get_by_role("button", name="Cancel booking").click()
    expect(page.locator("#cancel-panel")).to_contain_text("You'll get €85 back (100%)")
    shot(page, "s6-cancel-free")
    page.get_by_role("button", name="Keep booking").click()
    set_now(page, "2027-03-14T09:00:00")                 # 25 hours before handoff
    expect(page.get_by_role("button", name="Change dates")).to_have_count(1)
    page.get_by_role("button", name="Cancel booking").click()
    expect(page.locator("#cancel-panel")).to_contain_text("You'll get €42.50 back (50%)")
    shot(page, "s6-cancel-late-50")
    page.locator("#cancel-panel").get_by_role("button", name="Cancel booking").click()
    expect(page.locator(".flash")).to_have_text("Booking cancelled. €42.50 refunded.")
    expect(page.locator(f'[data-booking="{bid}"]')).to_have_attribute("data-state", "cancelled")
    assert db(page, f"Roam.booking(db, '{bid}').hold.status") == "released"
    expect(page.locator("#manage")).to_have_count(0)
    shot(page, "s6-cancelled")


# ---------------------------------------------------------------- story 7 and operator flow

def test_story7_operator_confirms_inspects_dispatches_and_hands_over_on_time(desk, base):
    bid = book(desk, base)
    desk.goto(base + "#ops")
    j = job(desk, bid)
    expect(j).to_contain_text("Confirm by Mon 1 Mar, 12:00")
    shot(desk, "op-1-new-booking")
    j.get_by_role("button", name="Confirm").click()
    expect(j.get_by_role("button", name="Dispatch")).to_be_disabled()
    expect(j).to_contain_text("needs an inspection before dispatch")
    shot(desk, "op-2-inspection-needed")
    j.get_by_role("button", name="Inspect").click()
    j.get_by_role("button", name="Dispatch").click()
    expect(j).to_have_attribute("data-state", "dispatched")
    unit = db(desk, f"Roam.booking(db, '{bid}').unitId")
    expect(desk.locator(f'tr[data-unit="{unit}"]')).to_have_attribute("data-state", "out")
    j.get_by_role("button", name="Record handoff").click()
    expect(desk.locator("#flash")).to_have_text("Handoff recorded: on time.")
    expect(desk.locator('[data-m="ontime"] b')).to_have_text("100%")
    shot(desk, "op-3-handed-over")
    desk.goto(base + f"#booking-{bid}")
    expect(desk.locator("#handoff")).to_contain_text("Mon 15 Mar, 10:00 to 12:00")
    expect(desk.locator("#handoff")).to_contain_text("Handed over Mon 15 Mar, 10:30")
    expect(desk.locator("#guide svg")).to_be_visible()
    desk.locator("#guide").get_by_role("link", name="Open the folding guide").click()
    expect(desk.locator(".guide li")).to_have_count(4)


def test_story7_parent_sees_window_inspection_and_folding_guide(page, base):
    bid = book(page, base)
    page.evaluate("""id => { const db = RoamApp.db, t = new Date(window.__ROAM_NOW), b = Roam.booking(db, id);
        Roam.confirmBooking(db, id, t); Roam.inspectUnit(db, b.unitId, Object.fromEntries(Roam.CFG.checklist.map(k => [k, true])), t);
        Roam.dispatch(db, id, t); RoamApp.save(); RoamApp.reload(); }""", bid)
    expect(page.locator("[data-status]").first).to_have_text("On its way")
    expect(page.locator("#handoff")).to_contain_text("It passed inspection Mon 1 Mar, 10:00")
    expect(page.locator("#guide svg")).to_be_visible()
    shot(page, "s7-on-its-way")
    page.get_by_role("link", name="Open the folding guide").click()
    expect(page.get_by_role("heading", name="Fold the Wren in one minute")).to_be_visible()
    shot(page, "s7-folding-guide")


def test_edge_late_handoff_is_flagged_and_counts_against_on_time(desk, base):
    bid = book(desk, base)
    desk.goto(base + "#ops")
    j = job(desk, bid)
    j.get_by_role("button", name="Confirm").click()
    j.get_by_role("button", name="Inspect").click()
    j.get_by_role("button", name="Dispatch").click()
    j.locator("input[type=datetime-local]").fill("2027-03-15T14:30")
    j.get_by_role("button", name="Record handoff").click()
    expect(desk.locator("#flash")).to_have_text("Handoff recorded: 2.5 hours late.")
    expect(desk.locator('[data-m="ontime"] b')).to_have_text("0%")
    assert "delivery fee refunded" in db(desk, f"Roam.booking(db, '{bid}').events.map(e => e.text).join(' ')")


def test_operator_declines_and_the_parent_is_refunded_automatically(desk, base):
    bid = book(desk, base)
    desk.goto(base + "#ops")
    job(desk, bid).get_by_role("button", name="Decline and refund").click()
    expect(desk.locator("#flash")).to_have_text("Booking declined. €75 refunded automatically.")
    desk.goto(base + f"#booking-{bid}")
    expect(desk.locator("[data-net]")).to_have_text("€0")
    expect(desk.locator("[data-status]").first).to_have_text("Declined and refunded")


def test_edge_faulty_stroller_is_replaced_from_inspected_stock(desk, base):
    bid = book(desk, base)
    desk.goto(base + "#ops")
    j = job(desk, bid)
    j.get_by_role("button", name="Confirm").click()
    j.get_by_role("button", name="Inspect").click()
    j.get_by_role("button", name="Dispatch").click()
    j.get_by_role("button", name="Faulty: replace").click()
    expect(desk.locator("#flash")).to_contain_text("No other inspected unit is free")
    desk.locator('tr[data-unit="LR-02"]').get_by_role("button", name="Inspect: pass").click()
    j.get_by_role("button", name="Faulty: replace").click()
    expect(desk.locator("#flash")).to_have_text("Replacement LR-02 due within 4 hours.")
    expect(desk.locator('tr[data-unit="LR-01"]')).to_have_attribute("data-state", "repair")


# ---------------------------------------------------------------- story 8

def test_story8_return_photo_inspection_and_hold_release(desk, base):
    bid = book(desk, base)
    desk.goto(base + "#ops")
    to_handed_over(desk, bid)
    j = job(desk, bid)
    j.get_by_role("button", name="Record collection").click()
    expect(desk.locator("#flash")).to_have_text("Take the return photo before recording the collection.")
    j.get_by_label("Return photo taken").check()
    j.get_by_role("button", name="Record collection").click()
    expect(desk.locator("#flash")).to_have_text("Collection recorded with return photo.")
    expect(j.locator(f"#k-{bid} input")).to_have_count(6)
    shot(desk, "op-4-return-inspection")
    j.get_by_role("button", name="Log return inspection").click()
    expect(desk.locator("#flash")).to_have_text("Clean return. €150 hold released.")
    unit = db(desk, f"Roam.booking(db, '{bid}').unitId")
    row = desk.locator(f'tr[data-unit="{unit}"]')
    expect(row).to_have_attribute("data-state", "cleaning")
    assert unit not in desk.locator("#avail-out").inner_text(), "a unit waiting for cleaning is not bookable"
    row.get_by_role("button", name="Mark cleaned").click()
    expect(row).to_have_attribute("data-state", "available")
    row.locator("summary").click()
    expect(row.locator(".log li")).to_have_count(5)            # inspection, rental out, rental back, inspection, cleaning
    shot(desk, "op-5-unit-history")
    desk.goto(base + f"#booking-{bid}")
    expect(desk.locator("#return")).to_contain_text("Collected Fri 19 Mar, 10:30. Return photo taken.")
    expect(desk.locator("#hold")).to_contain_text("€150 released")
    assert db(desk, f"Roam.booking(db, '{bid}').holdReleaseBy") == "2027-03-24"
    desk.locator("#rating").get_by_role("button", name="5 out of 5").click()
    expect(desk.locator("#rating")).to_contain_text("You rated this rental 5 out of 5")
    desk.goto(base + "#ops")
    expect(desk.locator('[data-m="sat"] b')).to_have_text("5.0 of 5")


def test_story8_parent_view_after_a_clean_return(page, base):
    bid = book(page, base)
    page.evaluate("""id => { const db = RoamApp.db, R = Roam, b = R.booking(db, id), ok = Object.fromEntries(R.CFG.checklist.map(k => [k, true]));
        const t = new Date(window.__ROAM_NOW); R.confirmBooking(db, id, t); R.inspectUnit(db, b.unitId, ok, R.at('2027-03-15', '07:00'));
        R.dispatch(db, id, R.at('2027-03-15', '07:30')); R.recordHandoff(db, id, R.at('2027-03-15', '10:20'));
        R.recordCollection(db, id, R.at('2027-03-19', '10:15'), true); R.inspectReturn(db, id, ok, [], R.at('2027-03-19', '15:00'));
        RoamApp.save(); RoamApp.reload(); }""", bid)
    expect(page.locator("#hold")).to_contain_text("Card hold released")
    expect(page.locator("#rating")).to_be_visible()
    shot(page, "s8-returned-hold-released")


def test_edge_damage_is_charged_from_the_price_list_against_the_hold(desk, base):
    bid = book(desk, base)
    desk.goto(base + "#ops")
    to_handed_over(desk, bid)
    j = job(desk, bid)
    j.get_by_label("Return photo taken").check()
    j.get_by_role("button", name="Record collection").click()
    j.get_by_label("wheel €35").check()
    j.get_by_label("canopy €60").check()
    j.get_by_role("button", name="Log return inspection").click()
    expect(desk.locator("#flash")).to_have_text("Damage logged. €95 charged.")
    desk.goto(base + f"#booking-{bid}")
    expect(desk.locator("[data-net]")).to_have_text("€170")
    expect(desk.locator("#hold")).to_contain_text("€95 kept")
    shot(desk, "edge-damage-charge")


def test_edge_late_return_charges_the_daily_rate_and_lost_needs_three_days(desk, base):
    bid = book(desk, base)
    desk.goto(base + "#ops")
    to_handed_over(desk, bid)
    j = job(desk, bid)
    set_now(desk, "2027-03-21T10:00:00")
    j.get_by_role("button", name="Mark as lost").click()
    expect(desk.locator("#flash")).to_have_text("A stroller counts as lost 3 days after the end date.")
    j.locator("input[type=datetime-local]").fill("2027-03-21T10:00")
    j.get_by_label("Return photo taken").check()
    j.get_by_role("button", name="Record collection").click()
    expect(desk.locator("#flash")).to_have_text("Collected 2 days late. €30 charged.")


# ---------------------------------------------------------------- operator stories

def test_operator_inventory_shows_free_units_per_date_and_blocks_uncleared_units(desk, base):
    desk.goto(base + "#ops")
    out = desk.locator("#avail-out")
    expect(out).to_contain_text("10 of 12 units free")
    assert "LR-11" not in out.inner_text() and "LR-12" not in out.inner_text()
    expect(desk.locator('tr[data-unit="LR-11"]')).to_have_attribute("data-state", "repair")
    expect(desk.locator('tr[data-unit="LR-12"]')).to_have_attribute("data-state", "quarantine")
    seed_full(desk, 3)
    desk.evaluate("RoamApp.reload()")
    desk.locator("#from").fill("2027-03-15")
    desk.locator("#to").fill("2027-03-19")
    desk.locator("#avail").get_by_role("button", name="Check").click()
    expect(out).to_contain_text("7 of 12 units free")
    assert db(desk, "new Set(db.bookings.map(b => b.unitId)).size") == 3, "three bookings, three different units"
    desk.locator('tr[data-unit="LR-11"]').get_by_role("button", name="Repair done").click()
    expect(desk.locator('tr[data-unit="LR-11"]')).to_have_attribute("data-state", "inspection")
    expect(out).to_contain_text("7 of 12 units free")
    desk.locator('tr[data-unit="LR-11"]').get_by_role("button", name="Inspect: pass").click()
    desk.locator('tr[data-unit="LR-11"]').get_by_role("button", name="Mark cleaned").click()
    expect(out).to_contain_text("8 of 12 units free")
    shot(desk, "op-6-inventory-and-fleet")


def test_metrics_tiles_follow_the_prd_definitions(desk, base):
    desk.goto(base + "#flying")
    check(desk, postcode="08901")
    book(desk, base)
    desk.goto(base + "#ops")
    expect(desk.locator('[data-m="denied"] b')).to_have_text("50%")
    expect(desk.locator('[data-m="conversion"] b')).to_have_text("0%")
    job(desk, db(desk, "db.bookings[0].id")).get_by_role("button", name="Confirm").click()
    expect(desk.locator('[data-m="conversion"] b')).to_have_text("100%")
    expect(desk.locator('[data-m="util"]')).to_contain_text("5 of 372 fleet days")
    expect(desk.locator("#demand")).to_contain_text("Out of zone")
    shot(desk, "op-7-metrics")


# ---------------------------------------------------------------- Pop-up (paused in the pilot)

def popup_to_review(page, base, plan="Premium", age="3", postcode="08012"):
    page.goto(base + "#popup")
    page.locator(f'input[name="plan"][value="{plan.lower()}"]').check()
    page.locator("#app").get_by_label("Child's age").select_option(age)
    page.get_by_role("button", name="Continue").click()
    page.locator("#app").get_by_label("Home address").fill("Carrer de Verdi 12")
    page.locator("#app").get_by_label("Postcode").fill(postcode)
    page.locator("#app").get_by_label("Start date").fill("2027-03-10")
    page.locator("#app").get_by_label("Name").fill("Ana Ruiz")
    page.locator("#app").get_by_label("Email").fill("ana@example.com")
    page.locator("#app").get_by_label("Phone").fill("+34 600 111 222")
    page.get_by_role("button", name="Review plan").click()


def test_popup_is_marked_paused_and_shows_both_plans(page, base):
    page.goto(base + "#popup")
    expect(page.locator("#paused")).to_contain_text("Monthly plans aren't on sale yet")
    assert page.locator(".choice .amt").all_inner_texts() == ["€55 a month", "€85 a month"]
    page.locator("#app").get_by_label("Child's age").select_option("3")
    expect(page.locator("#fitted")).to_contain_text("Wren with carrycot")
    shot(page, "p1-plan")
    page.locator("#app").get_by_label("Child's age").select_option("60")
    page.get_by_role("button", name="Continue").click()
    expect(page.locator("#age-err")).to_contain_text("up to their 4th birthday")


def test_popup_home_must_be_in_the_zone(page, base):
    popup_to_review(page, base, postcode="08901")
    expect(page.locator("#postcode-err")).to_contain_text("We only cover Barcelona city")
    shot(page, "p2-home-out-of-zone")


def test_popup_full_flow_start_swap_accessory_and_return(page, base):
    popup_to_review(page, base)
    summary = page.locator("#psummary")
    for needle in ["Premium plan", "Wren with carrycot", "First 30 days", "€85", "Then every 30 days", "Card hold, not charged", "€150"]:
        expect(summary).to_contain_text(needle)
    shot(page, "p3-review")
    page.get_by_role("button", name="Start plan and pay €85").click()
    page.wait_for_selector("#started")
    expect(page.locator("#config")).to_have_text("Wren with carrycot")
    expect(page.locator("[data-plan]")).to_contain_text("Next payment")
    expect(page.locator("[data-plan]")).to_contain_text("Fri 9 Apr")
    shot(page, "p4-plan-started")
    page.locator("#grow").get_by_label("Child's age now").select_option("8")
    page.get_by_role("button", name="Update age").click()
    expect(page.locator("#swap")).to_contain_text("Time to swap to the Wren with seat")
    page.locator("#app").get_by_label("Swap date").fill("2027-03-20")
    shot(page, "p5-swap-suggested")
    page.get_by_role("button", name="Book the swap").click()
    expect(page.locator(".flash")).to_contain_text("Swap booked. The Wren with seat arrives Sat 20 Mar")
    expect(page.locator("#config")).to_have_text("Wren with seat")
    page.get_by_role("button", name="Request rain cover").click()
    expect(page.locator("#extras")).to_contain_text("Rain cover requested")
    shot(page, "p6-swapped-with-accessory")
    page.locator("#app").get_by_label("Collection date").fill("2027-04-02")
    page.get_by_role("button", name="Book collection and end plan").click()
    expect(page.locator("#ending")).to_contain_text("Fri 2 Apr, 10:00 to 12:00")
    expect(page.locator("#ending")).to_contain_text("released by Wed 7 Apr")
    expect(page.locator("[data-plan]")).to_have_attribute("data-state", "ending")
    shot(page, "p7-collection-booked")
    page.goto(base + "#trips")
    expect(page.locator(".job")).to_have_count(1)
    shot(page, "p8-my-bookings")


def test_popup_basic_has_no_accessories_on_demand(page, base):
    popup_to_review(page, base, plan="Basic", age="18")
    page.get_by_role("button", name="Start plan and pay €55").click()
    page.wait_for_selector("#started")
    expect(page.locator("#extras")).to_contain_text("come with Premium")
    expect(page.locator("#extras button")).to_have_count(0)


# ---------------------------------------------------------------- pickup option

def test_landing_on_a_phone(page, base):
    """PRD: a mobile-friendly web page is enough for the pilot."""
    page.goto(base)
    expect(page.get_by_role("link", name="Check your dates").first).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "no sideways scroll"
    shot(page, "00-landing-phone", full=False)


def test_handoff_option_pickup_needs_no_address(page, base):
    page.goto(base + "#flying")
    check(page, method="pickup")
    expect(page.locator('[data-result="yes"]')).to_contain_text("have one ready to pick up")
    expect(page.locator("#app").get_by_label("Address")).to_have_count(0)
    page.get_by_role("button", name="Continue").click()
    expect(page.locator("#app")).to_contain_text("Partner pickup point, Eixample, Barcelona")
    shot(page, "s1-pickup-option")
