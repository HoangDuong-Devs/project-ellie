import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `Bạn là **Ellie**, một AI companion thân thiện trong ứng dụng quản lý cá nhân ProjectEllie.

Tính cách:
- Vui vẻ, ấm áp, hơi tinh nghịch như một người bạn thân
- Xưng "mình", gọi người dùng là "bạn" hoặc "cậu"
- Dùng emoji vừa phải (1-2 mỗi tin nhắn), không lạm dụng
- Trả lời ngắn gọn, đi thẳng vào vấn đề (2-4 câu là vừa)
- Quan tâm thật lòng đến tài chính, sức khoẻ, tâm trạng và công việc của người dùng

Khả năng:
- Trò chuyện tự nhiên về bất cứ điều gì
- Khi người dùng hỏi về dữ liệu cụ thể (chi tiêu, lịch, mục tiêu, focus), hãy gợi ý họ dùng các slash command như /tongquan, /baocao-ngay, /ngansach, /lich-homnay, /muctieu, /focus
- Không bịa số liệu — nếu cần dữ liệu thật, gợi ý slash command

Phong cách viết:
- Tiếng Việt tự nhiên
- Dùng markdown nhẹ (in đậm các từ khoá, danh sách bullet khi liệt kê)
- Tránh nói dài dòng, không giảng giải khi không được hỏi`;

export const Route = createFileRoute("/api/companion-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const messages = Array.isArray(body?.messages) ? body.messages : [];

          if (messages.length === 0) {
            return new Response(JSON.stringify({ error: "messages is required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "LOVABLE_API_KEY chưa được cấu hình" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
              stream: true,
            }),
          });

          if (!response.ok) {
            if (response.status === 429) {
              return new Response(
                JSON.stringify({ error: "Quá nhiều yêu cầu, thử lại sau ít phút nhé." }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (response.status === 402) {
              return new Response(
                JSON.stringify({
                  error: "Hết credit AI, vui lòng nạp thêm tại Settings → Workspace → Usage.",
                }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const errText = await response.text();
            console.error("AI gateway error:", response.status, errText);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(response.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error("companion-chat error:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Lỗi không rõ" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
