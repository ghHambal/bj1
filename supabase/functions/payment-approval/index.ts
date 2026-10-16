import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ADMIN_EMAIL = "kruhambalwaji@gmail.com";
const APP_URL = "https://ghhambal.github.io/bj1/";
const PAYMENT_BUCKET = "payment-slips";

function getKey(name: "publishable" | "secret") {
  const modern = Deno.env.get(name === "secret" ? "SUPABASE_SECRET_KEYS" : "SUPABASE_PUBLISHABLE_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed.default) return parsed.default;
    } catch (_) {
      // Fall through to the legacy environment variable.
    }
  }
  return Deno.env.get(name === "secret" ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY")!;
}

const supabaseAdmin = createClient(SUPABASE_URL, getKey("secret"), {
  auth: { autoRefreshToken: false, persistSession: false }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function html(body: string, status = 200) {
  return new Response(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ตรวจสอบคำขอชำระเงิน</title><style>body{font-family:Arial,sans-serif;background:#020617;color:#e2e8f0;display:flex;justify-content:center;padding:32px 16px}.card{max-width:520px;width:100%;background:#1e293b;border:1px solid #475569;border-radius:18px;padding:24px;text-align:center}h1{color:#fbbf24;font-size:22px}p{line-height:1.7;color:#cbd5e1}a,button{display:inline-block;border:0;border-radius:10px;padding:12px 18px;margin:6px;font-weight:700;text-decoration:none;cursor:pointer}.approve{background:#34d399;color:#052e16}.reject{background:#fb7185;color:#4c0519}.home{background:#475569;color:#fff}form{display:inline}</style></head><body><main class="card">${body}</main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getPaymentByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("exam_payments")
    .select("id,user_id,amount,reference_note,slip_path,status,approval_token")
    .eq("approval_token", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function sendAdminEmail(payment: Record<string, any>) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
  const approveUrl = `${SUPABASE_URL}/functions/v1/payment-approval?token=${encodeURIComponent(payment.approval_token)}&action=approve`;
  const rejectUrl = `${SUPABASE_URL}/functions/v1/payment-approval?token=${encodeURIComponent(payment.approval_token)}&action=reject`;
  let slipUrl = "";
  if (payment.slip_path) {
    const { data } = await supabaseAdmin.storage.from(PAYMENT_BUCKET).createSignedUrl(payment.slip_path, 86400);
    slipUrl = data?.signedUrl || "";
  }
  const slipLink = slipUrl ? `<p><a href="${escapeHtml(slipUrl)}">เปิดดูสลิปการโอน</a></p>` : "<p>ผู้ใช้ไม่ได้แนบสลิป</p>";
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [ADMIN_EMAIL],
      subject: `มีคำขอสนับสนุนใหม่ ${payment.amount} บาท`,
      html: `<h2>มีคำขอสนับสนุนแอปเตรียมสอบ</h2><p>จำนวนเงิน: <strong>${escapeHtml(payment.amount)} บาท</strong></p><p>หมายเหตุ: ${escapeHtml(payment.reference_note || "ไม่มี")}</p>${slipLink}<p><a href="${approveUrl}">เปิดหน้าตรวจสอบและอนุมัติ</a></p><p>ลิงก์ปฏิเสธ: <a href="${rejectUrl}">ปฏิเสธคำขอนี้</a></p><p>ระบบจะให้กดยืนยันอีกครั้งในหน้าตรวจสอบ เพื่อป้องกันระบบอีเมลสแกนลิงก์อัตโนมัติ</p>`
    })
  });
  if (!emailResponse.ok) throw new Error(`Resend error ${emailResponse.status}: ${await emailResponse.text()}`);
}

async function handleNotify(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "missing_authorization" }, 401);
  const userClient = createClient(SUPABASE_URL, getKey("publishable"), {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "not_authenticated" }, 401);
  const body = await req.json().catch(() => ({}));
  const paymentId = String(body.payment_id || "");
  if (!paymentId) return json({ error: "payment_id_required" }, 400);
  const { data: payment, error } = await supabaseAdmin
    .from("exam_payments")
    .select("id,user_id,amount,reference_note,slip_path,status,approval_token")
    .eq("id", paymentId)
    .eq("user_id", userData.user.id)
    .single();
  if (error || !payment) return json({ error: "payment_not_found" }, 404);
  if (payment.status !== "pending") return json({ error: "payment_not_pending" }, 409);
  await sendAdminEmail(payment);
  return json({ ok: true });
}

async function handleApproval(req: Request, url: URL) {
  const token = url.searchParams.get("token") || "";
  const action = url.searchParams.get("action") === "reject" ? "reject" : "approve";
  if (!token) return html("<h1>ลิงก์ไม่ครบ</h1><p>ไม่พบรหัสตรวจสอบคำขอ</p>", 400);
  const payment = await getPaymentByToken(token);
  if (!payment) return html("<h1>ไม่พบคำขอ</h1><p>ลิงก์นี้อาจไม่ถูกต้องหรือคำขอถูกลบแล้ว</p>", 404);
  if (req.method === "GET") {
    const actionText = action === "approve" ? "อนุมัติการชำระเงิน" : "ปฏิเสธคำขอ";
    const buttonClass = action === "approve" ? "approve" : "reject";
    return html(`<h1>ตรวจสอบคำขอชำระเงิน</h1><p>ยอดสนับสนุน <strong>${escapeHtml(payment.amount)} บาท</strong></p><p>กรุณากดยืนยันเพื่อ${actionText}</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><input type="hidden" name="action" value="${action}"><button class="${buttonClass}" type="submit">ยืนยัน${actionText}</button></form><a class="home" href="${APP_URL}">กลับไปที่แอป</a>`);
  }
  if (payment.status !== "pending") return html(`<h1>ดำเนินการแล้ว</h1><p>คำขอนี้มีสถานะ ${escapeHtml(payment.status)} อยู่แล้ว</p><a class="home" href="${APP_URL}">กลับไปที่แอป</a>`);
  const form = await req.formData();
  const formToken = String(form.get("token") || "");
  if (formToken !== token) return html("<h1>ลิงก์ไม่ถูกต้อง</h1>", 400);
  const nextStatus = action === "approve" ? "approved" : "rejected";
  const { error: paymentError } = await supabaseAdmin.from("exam_payments").update({
    status: nextStatus,
    reviewed_at: new Date().toISOString(),
    review_note: `ดำเนินการผ่านลิงก์อีเมล: ${nextStatus}`
  }).eq("id", payment.id).eq("status", "pending");
  if (paymentError) throw paymentError;
  if (nextStatus === "approved") {
    const { error: profileError } = await supabaseAdmin.from("exam_member_profiles").update({ access_status: "approved" }).eq("user_id", payment.user_id);
    if (profileError) throw profileError;
  }
  return html(`<h1>${nextStatus === "approved" ? "อนุมัติสำเร็จ" : "ปฏิเสธคำขอแล้ว"}</h1><p>ระบบอัปเดตสถานะในแอปเรียบร้อยแล้ว</p><a class="home" href="${APP_URL}">เปิดแอป</a>`);
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (req.method === "GET" || req.method === "POST" && url.searchParams.has("token")) {
      return await handleApproval(req, url);
    }
    if (req.method === "POST") return await handleNotify(req);
    return json({ error: "method_not_allowed" }, 405);
  } catch (error) {
    console.error(error);
    if (new URL(req.url).searchParams.has("token")) return html("<h1>เกิดข้อผิดพลาด</h1><p>ระบบยังดำเนินการไม่สำเร็จ กรุณาลองใหม่หรือตรวจสอบในหน้าแอดมิน</p>", 500);
    return json({ error: error instanceof Error ? error.message : "internal_error" }, 500);
  }
});
