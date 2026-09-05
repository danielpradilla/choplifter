import { LifelineGame } from "@/components/LifelineGame";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="masthead">
        <a className="wordmark" href="#game" aria-label="Lifeline 82 home">
          <span className="wordmark-mark" aria-hidden="true">L82</span>
          <span>
            <strong>LIFELINE ’82</strong>
            <small>A rescue-flight tribute</small>
          </span>
        </a>
        <div className="mission-chip">
          <span className="status-dot" aria-hidden="true" />
          Mission online
        </div>
      </header>

      <section className="hero" id="game" aria-labelledby="game-title">
        <div className="hero-copy">
          <p className="eyebrow">Bungeling frontier · 04:20 local</p>
          <h1 id="game-title">Bring every<br />one home.</h1>
          <p>
            Four barracks. Sixty-four captives. Three helicopters.
            The sky gets meaner with every rescue run.
          </p>
        </div>
        <LifelineGame />
      </section>

      <section className="briefing" aria-labelledby="briefing-title">
        <div>
          <p className="eyebrow">Flight briefing</p>
          <h2 id="briefing-title">The rescue is the score.</h2>
        </div>
        <div className="briefing-grid">
          <article>
            <span>01</span>
            <h3>Open the barracks</h3>
            <p>One group is already free. Clear each group before moving to the next.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Land with care</h3>
            <p>Set down level and nearby. A full cabin holds sixteen people—never one more.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Return to the pad</h3>
            <p>Only the home landing pad counts. Lost, aboard, and saved tell the whole story.</p>
          </article>
        </div>
      </section>

      <footer>
        <p>Original code and artwork. Inspired by Dan Gorlin’s 1982 rescue classic.</p>
        <p>Built for keyboard, mouse, and touch.</p>
      </footer>
    </main>
  );
}
