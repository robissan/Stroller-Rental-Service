import { useState } from "react";
import { ArrowDownRight, ArrowLeftRight, ArrowRight, Briefcase, Check, ChevronDown, Compass, MapPin, Plane, Plus, Sparkles, X } from "lucide-react";
import "./explorerefined.css";

const places = [
  { city: "Barcelona", country: "Spain", airport: "Barcelona El Prat (BCN) · sample desk", note: "Flat seafront promenades, old-town lanes." },
  { city: "Lisbon", country: "Portugal", airport: "Lisbon Humberto Delgado (LIS) · sample desk", note: "Steep hills, patterned pavements, trams." },
];

export default function ExploreRefined() {
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState<"trip" | "month">("trip");
  const [showBooking, setShowBooking] = useState(false);
  const [activeTab, setActiveTab] = useState("Explore");
  const place = places[placeIndex];
  const nextPlace = () => setPlaceIndex((placeIndex + 1) % places.length);

  return (
    <main className="lr-stage">
      <div className="lr-device">
        <div className="lr-scroll">
          <header className="lr-topbar">
            <a className="lr-brand" href="#explore" onClick={(e) => { e.preventDefault(); setActiveTab("Explore"); }}>
              <span className="lr-mark"><Compass size={19} strokeWidth={1.8} /></span>
              <span>little roam<span className="lr-brand-dot">.</span></span>
            </a>
            <button className="lr-avatar" aria-label="Open profile" onClick={() => setShowBooking(true)}>m</button>
          </header>
          <div className="lr-demo-notice"><Sparkles size={13} /><span><strong>Visual pilot · Demo only</strong> — no live inventory, payments or fulfillment.</span></div>

          <section className="lr-intro" id="explore">
            <p className="lr-eyebrow"><span className="lr-live-dot" /> SMALL TRIPS, BIG DAYS</p>
            <h1>Travel light.<br /><em>Roam longer.</em></h1>
            <p className="lr-intro-copy">A stroller concept for lighter days out together.</p>
          </section>

          <section className="lr-hero">
            <div className="lr-hero-copy">
              <span className="lr-kicker">A lighter way to go</span>
              <h2>Leave the<br />stroller at home.</h2>
              <p>A stroller concept for a lighter family trip.</p>
              <button className="lr-text-link" onClick={() => { setMode("trip"); document.getElementById("ways")?.scrollIntoView({ behavior: "smooth" }); }}>
                How it works <ArrowRight size={15} />
              </button>
            </div>
            <div className="lr-sun" />
            <svg className="lr-stroller" viewBox="0 0 170 162" fill="none" aria-label="Illustration of a stroller">
              <path d="M47 42h57c18 0 27 11 29 27l4 31H76L47 42Z" fill="#F2B84B"/>
              <path d="M44 39c-8 1-11 5-9 13l26 53h76" stroke="#F8F1E6" strokeWidth="5" strokeLinecap="round"/>
              <path d="M66 103 91 141M126 104l-14 38M47 42l-9-24" stroke="#F8F1E6" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="88" cy="143" r="11" fill="#E4D8C6" stroke="#F8F1E6" strokeWidth="4"/>
              <circle cx="113" cy="143" r="11" fill="#E4D8C6" stroke="#F8F1E6" strokeWidth="4"/>
              <path d="M104 43c-2-14 7-23 18-25" stroke="#F8F1E6" strokeWidth="4" strokeLinecap="round"/>
              <path d="M122 18c8-3 15-1 19 5-7 5-15 6-21 1" fill="#D9603B"/>
              <circle cx="59" cy="64" r="3" fill="#214A47"/><circle cx="74" cy="79" r="2" fill="#214A47"/>
            </svg>
            <span className="lr-hero-stamp"><Sparkles size={12} /> Pilot cities</span>
          </section>

          <section className="lr-ways" id="ways">
            <div className="lr-section-head">
              <div><p className="lr-eyebrow">PICK YOUR PACE</p><h2>Two ways to roam</h2></div>
              <span className="lr-step">01 <span>/</span> 02</span>
            </div>
            <div className="lr-mode-switch" role="tablist" aria-label="Choose rental type">
              <button className={mode === "trip" ? "selected" : ""} role="tab" aria-selected={mode === "trip"} onClick={() => setMode("trip")}><Plane size={15} /> For a trip</button>
              <button className={mode === "month" ? "selected" : ""} role="tab" aria-selected={mode === "month"} onClick={() => setMode("month")}><ArrowLeftRight size={15} /> By the month</button>
            </div>
            <div className="lr-option">
              <div className="lr-option-icon">{mode === "trip" ? <Briefcase size={19} /> : <ArrowLeftRight size={19} />}</div>
              <div className="lr-option-body">
                <div className="lr-option-title">{mode === "trip" ? "Flying solutions" : "Pop-up solutions"}<span className="lr-tag">PILOT</span></div>
                <p>{mode === "trip" ? "Illustrative airport or hotel handoff." : "Basic €45 · Premium €79, per month."}</p>
              </div>
              <div className="lr-price"><strong>{mode === "trip" ? "€12" : "from €45"}</strong><small>{mode === "trip" ? "/ day · concept" : "Premium €79"}</small></div>
            </div>
            <button className="lr-primary" onClick={() => setShowBooking(true)}>
              {mode === "trip" ? "Explore trip concept" : "View plan concept"} <ArrowRight size={16} />
            </button>
            <p className="lr-reassurance"><Check size={13} /> Illustrative pricing only · no checkout</p>
          </section>

          <section className="lr-destination">
            <div className="lr-destination-head">
              <div><p className="lr-eyebrow">FIRST STOPS</p><h2>Where to?</h2></div>
              <button className="lr-round-arrow" aria-label="Next destination" onClick={nextPlace}><ArrowDownRight size={17} /></button>
            </div>
            <button className="lr-city-card" onClick={nextPlace}>
              <div className="lr-city-art" aria-hidden="true">
                <div className="lr-art-sun" />
                <div className="lr-art-building building-one" /><div className="lr-art-building building-two" /><div className="lr-art-building building-three" />
                <div className="lr-art-ground" />
              </div>
              <div className="lr-city-content">
                <span className="lr-country">{place.country} <ChevronDown size={12} /></span>
                <h3>{place.city}</h3>
                <p>{place.note}</p>
                <span className="lr-airport"><MapPin size={12} /> {place.airport}</span>
              </div>
              <span className="lr-city-next"><ArrowRight size={15} /></span>
            </button>
          </section>

          <footer className="lr-footer-note">Little Roam is an independent concept inspired by a 2016 course. It is not affiliated with Bugaboo. Prices, coverage and policies are illustrative, not commercial offers.</footer>
        </div>

        <nav className="lr-nav" aria-label="Main navigation">
          {[
            { name: "Explore", icon: <Compass size={18} /> },
            { name: "Plans", icon: <ArrowLeftRight size={18} /> },
            { name: "Rentals", icon: <Briefcase size={18} /> },
            { name: "Guide", icon: <Plus size={18} /> },
          ].map((item) => <button key={item.name} className={activeTab === item.name ? "active" : ""} onClick={() => setActiveTab(item.name)}>{item.icon}<span>{item.name}</span></button>)}
        </nav>
      </div>
      {showBooking && <div className="lr-modal-backdrop" onClick={() => setShowBooking(false)}>
        <section className="lr-modal" role="dialog" aria-modal="true" aria-labelledby="lr-dialog-title" onClick={(e) => e.stopPropagation()}>
          <button className="lr-close" aria-label="Close" onClick={() => setShowBooking(false)}><X size={18} /></button>
          <span className="lr-modal-icon"><Plane size={20} /></span>
          <p className="lr-eyebrow">YOUR NEXT LITTLE ADVENTURE</p>
          <h2 id="lr-dialog-title">{mode === "trip" ? `Imagine a trip to ${place.city}.` : "Explore the monthly concept."}</h2>
          <p>This is a visual pilot only, not a real booking. There is no live inventory, payment or fulfillment. {mode === "trip" ? `The ${place.airport} handoff is illustrative.` : "Basic is €45/month; Premium is €79/month. Prices are illustrative."}</p>
          <button className="lr-primary" onClick={() => setShowBooking(false)}>Back to the demo <Check size={16} /></button>
        </section>
      </div>}
    </main>
  );
}
