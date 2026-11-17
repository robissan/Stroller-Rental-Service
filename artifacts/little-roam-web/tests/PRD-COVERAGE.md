# PRD v2 coverage

What the tests check against the PRD, and where the demo stops short. Last run: 22 rule tests and 30 browser tests, all passing.

    node --test tests/rules.test.js          # pricing and policy rules, no browser
    pytest tests/test_flows.py               # the flows in a browser; writes tests/screenshots/

Status: **Met** = built and tested. **Simulated** = the screen and rule exist, but nothing real happens (no email, card or courier). **Not built** = outside this demo.

## Parent stories

| # | Acceptance criterion | Status | Test | Screenshot |
|---|---|---|---|---|
| 1 | Address and dates show yes or no on one screen | Met | `test_story1_served_address_and_dates_show_yes_on_one_screen` | `s1-check-yes` |
| 1 | A "no" offers a waitlist and is logged as denied demand | Met | `test_story1_out_of_zone_...`, `test_story1_no_unit_free_...` | `s1-check-no-zone-waitlist`, `s1-check-no-units` |
| 2 | Model, age and weight range, folded size and photos before booking | Met (photos are renders) | `test_story2_model_range_folded_size_and_photos_show_before_booking` | `s2-model-fit` |
| 2 | A child outside the range can't proceed | Met, on age only | `test_story2_child_outside_the_range_cannot_proceed` | `s2-child-outside-range` |
| 3 | Rain cover and mosquito net priced separately; only compatible items offered | Met | `test_story3_only_compatible_accessories_offered_each_priced_separately` | `s3-accessories` |
| 4 | One summary: days, daily rate, add-ons, delivery fee, total, cancellation, damage terms; nothing added after | Met | `test_story4_one_summary_with_full_price_and_terms_and_nothing_added_after` | `s4-summary-and-terms` |
| 5 | Booking needs only name, email, phone, address, dates, child age | Met | `test_story5_book_with_only_the_needed_fields_...` | `s5-your-details` |
| 5 | Book and pay in under 3 minutes | Simulated: the scripted run takes seconds; no real parent was timed and no card is taken | same | |
| 5 | Confirmation email within 5 minutes with handoff details | Simulated: the email is shown on screen, not sent | same | `s5-confirmation` |
| 6 | A link in the confirmation changes dates or cancels | Met | `test_story6_change_dates_from_the_confirmation_link` | `s6-change-dates` |
| 6 | Refund rules applied automatically | Met (100% before 48 hours, 50% after, none after handoff) | `test_story6_cancel_applies_the_refund_rule_automatically`, rule test "Story 6" | `s6-cancel-free`, `s6-cancel-late-50`, `s6-cancelled` |
| 7 | Handoff in the agreed 2-hour window | Met as a record: the operator logs the time, on-time is computed | `test_story7_operator_confirms_...`, `test_edge_late_handoff_...` | `op-3-handed-over` |
| 7 | Stroller passed inspection within 24 hours of dispatch | Met: dispatch is blocked without it | same, rule test "Story 7" | `op-2-inspection-needed`, `s7-on-its-way` |
| 7 | 1-minute folding guide | Met (demo wording, QR code and link) | `test_story7_parent_sees_window_inspection_and_folding_guide` | `s7-folding-guide` |
| 8 | Collection booked at checkout | Met | story 4 and 5 tests | `s4-summary-and-terms` |
| 8 | Return photo taken at collection | Simulated: a required tick box, no photo upload | `test_story8_return_photo_inspection_and_hold_release` | `op-4-return-inspection` |
| 8 | Hold released within 3 working days if no damage | Simulated: the date is computed and shown; no real card hold | same, `test_story8_parent_view_after_a_clean_return` | `s8-returned-hold-released` |

## Operator stories and flow

| Requirement | Status | Test | Screenshot |
|---|---|---|---|
| Free units per date; no double-booking | Met | `test_operator_inventory_...`, rule test "Operator: the same stroller cannot be double-booked" | `op-6-inventory-and-fleet` |
| Every unit has a history of rentals, inspections, cleanings, repairs | Met | `test_story8_return_photo_inspection_and_hold_release` | `op-5-unit-history` |
| Inspection, cleaning and repair block a unit until cleared | Met | `test_operator_inventory_...`, rule test "Operator: inspection, cleaning..." | `op-6-inventory-and-fleet` |
| Confirm within 2 working hours, or decline and refund automatically | Met (deadline shown, overdue flagged; no automatic decline on timeout) | `test_operator_declines_...`, rule test "Operator flow" | `op-1-new-booking` |
| Assign an inspected unit, dispatch, record handoff, inspect, clean, mark available/repair/retired | Met | story 7 and 8 operator tests | `op-1` to `op-5` |

## Edge cases

| Case | Status | Test |
|---|---|---|
| No unit available: "not available", waitlist, logged | Met | `test_story1_no_unit_free_...` |
| Courier more than 2 hours late refunds the delivery fee | Met, but the fee is €0 in the pilot so €0 is refunded | `test_edge_late_handoff_...` |
| Dates change free up to 48 hours before, subject to availability | Met | story 6 tests |
| Damage charged from a price list, capped at replacement cost; wear free | Met with placeholder prices | `test_edge_damage_...` (`edge-damage-charge`) |
| Late return: daily rate per extra day; lost after 3 days | Met | `test_edge_late_return_...`, rule test |
| Faulty at handoff: replace within 4 hours or refund in full | Met (deadline recorded, not timed) | `test_edge_faulty_stroller_...`, rule test |

## Scope, pricing and metrics

| PRD item | Status | Test |
|---|---|---|
| €15 a day, 3 to 14 days, €10 per accessory, delivery included, €150 hold | Met | rule tests "Pricing", "MVP scope"; `test_landing_matches_prd_v2` (`00-landing-prices`) |
| Two handoff options: delivery in a fixed zone, or one partner pickup point | Met | `test_handoff_option_pickup_needs_no_address` (`s1-pickup-option`) |
| Mobile-friendly web page, no native app | Met | `test_landing_on_a_phone`; parent screenshots are taken at phone width |
| Little Roam everywhere, no brand claims | Met | `test_landing_matches_prd_v2` |
| Booking conversion, denied demand, on-time handoff, utilisation, satisfaction | Met | `test_metrics_tiles_...` (`op-7-metrics`), rule test "Metrics" |
| Contribution per unit | Not built: no cost lines are logged, so the tile shows revenue only | |
| Pop-up Basic and Premium | Built as a demo flow marked "Paused in the pilot", at the survey mid-points €55 and €85 | `test_popup_*` (`p1` to `p8`) |

## Not built

- Real payments, card pre-authorisation, email, reminders and WhatsApp support.
- Customer acquisition cost, per-booking cost lines, weekly reconciliation.
- A delivery-fee price test (the survey's "included vs €10").
- Go/no-go gates, the SOP, insurance and legal review: these are process, not software.

## Placeholders the PRD doesn't define

These were needed to make the flows run. They are marked `PLACEHOLDER` in `js/roam.js`.

- Zone: Barcelona postcodes 08001 to 08042. Pickup point: "Eixample".
- Model: "Wren", 6 months to 4 years, up to 22 kg, 52 × 44 × 25 cm, 7.2 kg.
- Damage price list (wheel €35, canopy €60, frame €180) and replacement cost (€400).
- One day between rentals for inspection and cleaning. Rentals can't start the same day.
- Rental days count both the first and last day, so Monday to Friday is 5 days.
- Pop-up terms: 30-day month, swaps included, end by booking a collection.
