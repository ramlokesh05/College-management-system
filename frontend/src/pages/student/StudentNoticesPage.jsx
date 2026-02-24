import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const StudentNoticesPage = () => {
  const { data, loading } = useAsyncData(studentService.getNotices, []);

  if (loading) return <GlassCard>Loading notices...</GlassCard>;

  return (
    <div className="space-y-4">
      {data?.length ? (
        data.map((notice) => (
          <GlassCard key={notice._id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {notice.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {new Date(notice.createdAt).toLocaleDateString()}
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{notice.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-sky-300/70 bg-sky-100/85 px-2 py-1 backdrop-blur-sm dark:border-sky-400/40 dark:bg-sky-500/25">
                Posted by {notice.postedBy?.name || "Admin"}
              </span>
              {notice.course ? (
                <span className="rounded-full bg-brand-100 px-2 py-1 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                  {notice.course.code}
                </span>
              ) : null}
            </div>
            {notice.attachmentUrl ? (
              <a
                href={notice.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-brand-700 underline dark:text-brand-300"
              >
                Download Notice Attachment
              </a>
            ) : null}
          </GlassCard>
        ))
      ) : (
        <GlassCard>No notices available.</GlassCard>
      )}
    </div>
  );
};

export default StudentNoticesPage;
