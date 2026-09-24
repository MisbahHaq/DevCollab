export default function Filters({ onChange }) {
  const handle = (key) => (e) => onChange({ [key]: e.target.value });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <select onChange={handle("language")} className={selectClass} defaultValue="">
        <option value="">Any language</option>
        {["JavaScript", "TypeScript", "Python", "Rust", "Go", "Java", "C++", "Ruby"].map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <select onChange={handle("difficulty")} className={selectClass} defaultValue="">
        <option value="">Any difficulty</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <select onChange={handle("size")} className={selectClass} defaultValue="">
        <option value="">Any size</option>
        <option value="small">Small hobby</option>
        <option value="medium">Medium</option>
        <option value="large">Large org</option>
      </select>

      <select onChange={handle("sort")} className={selectClass} defaultValue="match">
        <option value="match">Sort: match score</option>
        <option value="stars">Sort: stars</option>
        <option value="activity">Sort: activity</option>
        <option value="issues">Sort: open issues</option>
      </select>
    </div>
  );
}

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";