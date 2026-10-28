export default function Plate({ value }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-slate-700">
      {value}
    </span>
  );
}