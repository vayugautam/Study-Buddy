import { Link } from "react-router";
import Icon from "../components/Icon";

export default function PublicHome() {
  return (
    <div className="public-page">
      <header className="public-nav">
        <Link to="/" className="brand-lockup"><span className="brand-mark"><Icon name="book" size={22} /></span><span><strong>study buddy</strong><small>AI learning workspace</small></span></Link>
        <div className="public-nav-actions"><Link className="text-link" to="/login">Sign in</Link><Link className="button button-dark button-small" to="/register">Create account <Icon name="arrow" size={15} /></Link></div>
      </header>
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="hero-kicker"><span className="kicker-dot" /> A calmer way to study</span>
            <h1>Make your course notes<br /><em>work harder.</em></h1>
            <p>Bring your PDFs together, ask the questions you actually have, and get clear answers grounded in your own study material.</p>
            <div className="hero-actions"><Link to="/register" className="button button-dark">Start studying <Icon name="arrow" size={17} /></Link><Link to="/login" className="button button-light">I already have an account</Link></div>
            <div className="hero-proof"><span className="proof-check"><Icon name="check" size={13} /></span> Your documents stay in your private workspace</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-paper"><div className="paper-top"><span className="paper-badge"><Icon name="book" size={15} /></span><span className="paper-meta">STUDY NOTES · 08 PAGES</span><span className="paper-dots">···</span></div><div className="paper-title">The things you<br />need to know.</div><div className="paper-rule" /><div className="paper-line line-long" /><div className="paper-line line-mid" /><div className="paper-highlight"><span /><div><b>Key idea</b><small>Concepts made clearer, one question at a time.</small></div></div><div className="paper-line line-long" /><div className="paper-line line-short" /></div>
            <div className="floating-note"><span className="floating-spark"><Icon name="spark" size={15} /></span><span><b>Grounded answers</b><small>Every source accounted for</small></span><span className="floating-check"><Icon name="check" size={13} /></span></div>
            <div className="art-stamp">LEARN<br />AT YOUR<br />OWN PACE</div>
          </div>
        </section>
        <section className="public-features">
          <div className="feature-intro"><span className="eyebrow">A BETTER STUDY LOOP</span><h2>From reading to<br />really understanding.</h2></div>
          <article className="feature-card"><span className="feature-icon feature-icon-sage"><Icon name="files" size={21} /></span><h3>Your materials, together</h3><p>Keep your course PDFs in one organized, personal library.</p></article>
          <article className="feature-card"><span className="feature-icon feature-icon-gold"><Icon name="chat" size={21} /></span><h3>Questions welcome</h3><p>Talk through difficult topics in a persistent study conversation.</p></article>
          <article className="feature-card"><span className="feature-icon feature-icon-lilac"><Icon name="spark" size={21} /></span><h3>Sources included</h3><p>See which document and page support each answer.</p></article>
        </section>
      </main>
      <footer className="public-footer"><span>Study Buddy AI</span><span>Built for learning, one question at a time.</span></footer>
    </div>
  );
}
