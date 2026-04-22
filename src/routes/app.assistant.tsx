import { createFileRoute } from "@tanstack/react-router";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { ASSISTANT_COMMANDS } from "@/hooks/useAssistantInsights";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({ meta: [{ title: "Trợ lý — ProjectEllie" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  return (
    <div>
      <PageHeader
        title="Trợ lý Ellie ✨"
        description="Hỏi nhanh về tài chính, lịch, mục tiêu và focus của bạn."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="h-[calc(100vh-220px)] min-h-[480px]">
          <AssistantPanel variant="page" />
        </div>
        <aside className="space-y-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Các lệnh có sẵn</h3>
            <ul className="space-y-2">
              {ASSISTANT_COMMANDS.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span>{c.emoji}</span>
                    <code className="font-mono-brand rounded bg-muted px-1.5 py-0.5 text-xs text-primary">
                      {c.label}
                    </code>
                  </div>
                  <p className="ml-6 mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-dashed border-border bg-gradient-brand-soft p-5 text-sm">
            <p className="font-semibold">Sắp ra mắt</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Trợ lý sẽ sớm hiểu được câu hỏi tự nhiên và đề xuất hành động cho bạn (thêm chi tiêu,
              tạo sự kiện, gợi ý cắt giảm...).
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
