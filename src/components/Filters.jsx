export default function Filters({ onChange, query = "" }) {
  const handle = (key) => (e) => onChange({ [key]: e.target.value });

  return (
    <div className="brutal flex flex-wrap items-center gap-3 border-ink bg-white p-3">
      <input
        value={query}
        onChange={(e) => onChange({ query: e.target.value })}
        placeholder="🔎 Search name / language…"
        className="input-brutal min-w-44 flex-1 px-3 py-1.5 lg:flex-none"
      />
      <select onChange={handle("language")} defaultValue="" className={selectClass}>
        <option value="">Any language</option>
        {["JavaScript", "TypeScript", "Python", "Rust", "Go", "Java", "C++", "Ruby", "PHP", "C", "C#", "Kotlin", "Swift", "Scala", "Zig", "Lua", "Shell"].map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <select onChange={handle("difficulty")} defaultValue="" className={selectClass}>
        <option value="">Any difficulty</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <select onChange={handle("size")} defaultValue="" className={selectClass}>
        <option value="">Any size</option>
        <option value="small">Small hobby</option>
        <option value="medium">Medium</option>
        <option value="large">Large org</option>
      </select>

      <select onChange={handle("sort")} defaultValue="match" className={selectClass}>
        <option value="match">Sort: match score</option>
        <option value="stars">Sort: stars</option>
        <option value="activity">Sort: activity</option>
        <option value="issues">Sort: open issues</option>
      </select>
    </div>
  );
}

const selectClass =
  "rounded-none border-2 border-ink bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none transition focus:shadow-[3px_3px_0_#171717]";