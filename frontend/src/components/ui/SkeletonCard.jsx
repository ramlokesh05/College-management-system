const SkeletonCard = ({ className = "" }) => (
  <div className={`glass-card animate-pulse p-5 ${className}`}>
    <div className="mb-2 h-3 w-24 rounded bg-orange-300/45 dark:bg-orange-500/25" />
    <div className="mb-3 h-7 w-20 rounded bg-orange-400/45 dark:bg-orange-500/35" />
    <div className="h-3 w-32 rounded bg-orange-300/45 dark:bg-orange-500/25" />
  </div>
);

export default SkeletonCard;
