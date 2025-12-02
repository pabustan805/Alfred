import { ScriptWorkspace } from '../components/ScriptWorkspace'

export function ScriptsPage() {
  return (
    <section className="scripts" aria-label="Scripts workspace">
      <header className="page-hero" aria-label="Scripts hero">
        <div>
          <p>Advanced control center</p>
          <h1>Scripts</h1>
          <span>Author, review, and orchestrate every script artifact in one canvas.</span>
        </div>
        <div className="page-hero__actions">
          <div className="page-hero__meta">
            <strong>Multi-language&nbsp;</strong>
            <span>bash · python · node · ruby · perl · groovy</span>
          </div>
        </div>
      </header>

      <ScriptWorkspace />
    </section>
  )
}

export default ScriptsPage
