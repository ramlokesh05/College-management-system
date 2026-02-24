import GlassCard from "./GlassCard";

const toneMap = {
  cyan: {
    chip: "border-orange-300/80 bg-orange-100/85 text-orange-700 dark:border-orange-400/45 dark:bg-orange-500/20 dark:text-orange-100",
    glow: "bg-orange-400/35",
  },
  emerald: {
    chip:
      "border-amber-300/80 bg-amber-100/85 text-amber-700 dark:border-amber-400/45 dark:bg-amber-500/20 dark:text-amber-100",
    glow: "bg-amber-400/35",
  },
  amber: {
    chip: "border-orange-400/80 bg-orange-200/75 text-orange-800 dark:border-orange-500/45 dark:bg-orange-600/20 dark:text-orange-100",
    glow: "bg-orange-500/35",
  },
};

const StatCard = ({ title, value, subtitle, icon: Icon, tone = "cyan", className = "" }) => {
  const theme = toneMap[tone] || toneMap.cyan;

  return (
    <GlassCard className={`glass-tile flex items-start justify-between ${className}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a5633] dark:text-orange-200/75">
          {title}
        </p>
        <p className="mt-2 text-3xl font-bold text-[#2f1b0d] dark:text-orange-50">{value}</p>
        {subtitle ? (
          <p className="mt-1 text-xs text-[#9a633b] dark:text-orange-200/80">{subtitle}</p>
        ) : null}
      </div>

      {Icon ? (
        <div className={`rounded-xl border p-2.5 ${theme.chip}`}>
          <Icon size={18} />
        </div>
      ) : null}

      <span className={`pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-2xl ${theme.glow}`} />
    </GlassCard>
  );
};

export default StatCard;
