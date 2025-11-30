import { ScriptWorkspace } from '../components/ScriptWorkspace'

export function ScriptsPage() {
  return (
    <section className="scripts" aria-label="Scripts workspace">
      <header className="scripts__hero">
        <div>
          <p>Advanced control center</p>
          <h2>Scripts</h2>
          <span>Author, review, and orchestrate every automation artifact in one canvas.</span>
        </div>
        <div className="scripts__hero-meta">
          <strong>Multi-language</strong>
          <span>bash · python · node</span>
        </div>
      </header>

      <ScriptWorkspace />
    </section>
  )
}

export default ScriptsPage
