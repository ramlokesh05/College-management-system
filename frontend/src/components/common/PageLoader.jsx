const PageLoader = ({ label = "Loading dashboard..." }) => (
  <div className="flex min-h-[240px] items-center justify-center">
    <div className="glass-card flex items-center gap-3 px-6 py-4 text-[#7a4a28] dark:text-orange-100">
      <span className="h-3 w-3 animate-pulse rounded-full bg-brand-500" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  </div>
);

export default PageLoader;
