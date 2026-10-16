// ข้อฝึกเสมือนจริงชุดที่ 8 จำนวน 500 ข้อ
// ประกอบด้วยโจทย์คณิตศาสตร์ชุดใหม่ และโจทย์ฝึกเสริมที่หมุนบริบทจากหัวข้ออ้างอิง
(() => {
  const names = { math: "ภาค ก: คณิต&เหตุผล", thai: "ภาค ก: ภาษาไทย", eng: "ภาค ก: ภาษาอังกฤษ", goodgov: "ภาค ก: ข้าราชการที่ดี", edu: "ภาค ข: วิชาการศึกษา", law: "ภาค ข: กฎหมายการศึกษา", cs: "ความรู้คอมพิวเตอร์" };
  const rotate = (correct, distractors, shift) => { const values = [String(correct), ...distractors.map(String)]; const n = shift % 4; const options = values.slice(n).concat(values.slice(0, n)); return { options, ans: options.indexOf(String(correct)) }; };
  const make = (subject, topic, difficulty, q, correct, distractors, exp, tip, shift) => { const picked = rotate(correct, distractors, shift); return { subject, subjectName: names[subject], type: "simulated", source: "ข้อสอบเสมือนจริงจากเอกสารอ้างอิง ชุดที่ 8", topic, difficulty, q, options: picked.options, ans: picked.ans, exp, tip }; };
  const fmt = (n) => Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return Math.abs(a); };
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
  const all = [];

  // คณิตศาสตร์ชุดตัวเลขใหม่ 100 ข้อ
  [[615, 12], [845, 16], [1_275, 24], [1_560, 18], [1_875, 20], [2_150, 15], [2_640, 25], [3_150, 12.5], [4_200, 30], [5_500, 22]].forEach(([p, r], i) => { const a = p * (1 - r / 100); all.push(make("math", "ร้อยละ", "กลาง", `เครื่องมือราคา ${fmt(p)} บาท ลด ${r}% ต้องจ่ายกี่บาท`, `${fmt(a)} บาท`, [`${fmt(p)} บาท`, `${fmt(a + 35)} บาท`, `${fmt(p * (1 + r / 100))} บาท`], `ราคาสุทธิ = ${fmt(p)} × (1 - ${r}/100) = ${fmt(a)} บาท`, "คิดส่วนลดจากราคาตั้งต้น", i)); });
  [[13, 21, 29, 37, 45], [16, 25, 34, 43, 52], [7, 18, 29, 40, 51], [22, 28, 34, 40, 46], [31, 38, 45, 52, 59], [10, 19, 28, 37, 46], [17, 26, 35, 44, 53], [24, 30, 36, 42, 48], [5, 14, 23, 32, 41], [27, 35, 43, 51, 59]].forEach((v, i) => { const a = v.reduce((s, x) => s + x, 0) / v.length; all.push(make("math", "ค่าเฉลี่ย", "ง่าย", `ข้อมูล ${v.join(", ")} มีค่าเฉลี่ยเท่าใด`, fmt(a), [fmt(a - 2), fmt(a + 2), fmt(a + 5)], `ผลรวม ${v.reduce((s, x) => s + x, 0)} หารด้วย ${v.length} = ${fmt(a)}`, "รวมข้อมูลก่อนหาร", i)); });
  [[3, 4, 84], [4, 5, 99], [5, 7, 120], [6, 8, 126], [7, 11, 144], [8, 9, 153], [9, 13, 176], [10, 11, 189], [11, 12, 207], [12, 13, 225]].forEach(([a, b, total], i) => { const x = total * a / (a + b); all.push(make("math", "อัตราส่วน", "กลาง", `ห้อง A ต่อห้อง B เป็น ${a}:${b} จากทั้งหมด ${total} คน ห้อง A มีกี่คน`, `${fmt(x)} คน`, [`${fmt(x - a)} คน`, `${fmt(x + a)} คน`, `${fmt(total - x)} คน`], `จำนวนห้อง A = ${total} ÷ ${a + b} × ${a} = ${fmt(x)}`, "รวมจำนวนส่วนก่อนคำนวณ", i)); });
  [[4, 12], [5, 15], [6, 18], [7, 21], [8, 20], [9, 27], [10, 25], [12, 30], [14, 35], [16, 40]].forEach(([a, b], i) => { const x = a * b / (a + b); all.push(make("math", "งานและเวลา", "ยาก", `เครื่องจักร A ทำงานเสร็จใน ${a} ชั่วโมง B ใน ${b} ชั่วโมง ทำพร้อมกันใช้กี่ชั่วโมง`, `${fmt(x)} ชั่วโมง`, [`${fmt(a + b)} ชั่วโมง`, `${fmt(Math.min(a, b))} ชั่วโมง`, `${fmt(x + 2)} ชั่วโมง`], `อัตรารวมทำให้เวลาเท่ากับ ${fmt(x)} ชั่วโมง`, "รวมอัตรา ไม่ใช่รวมเวลา", i)); });
  [[18, 24], [20, 28], [24, 32], [25, 40], [27, 36], [30, 42], [32, 40], [36, 48], [40, 60], [45, 75]].forEach(([a, b], i) => { const x = lcm(a, b); all.push(make("math", "ค.ร.น.", "กลาง", `ค.ร.น. ของ ${a} และ ${b} เท่ากับเท่าใด`, fmt(x), [fmt(x / 2), fmt(x + 8), fmt(x + 16)], `พหุคูณร่วมที่น้อยที่สุดคือ ${x}`, "ตรวจการหารลงตัว", i)); });
  [[45, 75], [56, 84], [64, 96], [70, 105], [81, 108], [88, 132], [100, 150], [112, 168], [126, 189], [144, 216]].forEach(([a, b], i) => { const x = gcd(a, b); all.push(make("math", "ห.ร.ม.", "กลาง", `ห.ร.ม. ของ ${a} และ ${b} เท่ากับเท่าใด`, fmt(x), [fmt(x / 2), fmt(x + 7), fmt(x + 14)], `ตัวหารร่วมมากที่สุดคือ ${x}`, "คำตอบต้องหารทั้งสองจำนวนลงตัว", i)); });
  [[12, 7], [15, 8], [18, 10], [21, 12], [24, 14], [27, 16], [30, 18], [33, 20], [36, 22], [40, 25]].forEach(([w, h], i) => { const x = w * h; all.push(make("math", "พื้นที่", "ง่าย", `แปลงรูปสี่เหลี่ยมผืนผ้ายาว ${w} กว้าง ${h} เมตร มีพื้นที่เท่าใด`, `${fmt(x)} ตารางเมตร`, [`${fmt(2 * (w + h))} ตารางเมตร`, `${fmt(x - w)} ตารางเมตร`, `${fmt(x + h)} ตารางเมตร`], `พื้นที่ = ${w} × ${h} = ${x} ตารางเมตร`, "ยาวคูณกว้าง", i)); });
  [[9, 8], [11, 10], [13, 12], [15, 14], [17, 16], [19, 18], [21, 20], [23, 22], [25, 24], [27, 26]].forEach(([b, h], i) => { const x = b * h / 2; all.push(make("math", "พื้นที่สามเหลี่ยม", "กลาง", `สามเหลี่ยมฐาน ${b} สูง ${h} เซนติเมตร มีพื้นที่เท่าใด`, `${fmt(x)} ตารางเซนติเมตร`, [`${fmt(b * h)} ตารางเซนติเมตร`, `${fmt(x + b)} ตารางเซนติเมตร`, `${fmt(x - h)} ตารางเซนติเมตร`], `พื้นที่ = 1/2 × ${b} × ${h} = ${fmt(x)}`, "หารสองหลังคูณฐานกับสูง", i)); });
  [[5200, 3, 2], [6800, 4, 2], [7600, 5, 2], [9200, 6, 1], [10_800, 2.5, 4], [12_600, 3, 2], [15_200, 4, 1.5], [18_000, 5, 2], [21_500, 6, 1], [25_000, 7, 2]].forEach(([p, r, y], i) => { const x = p * r / 100 * y; all.push(make("math", "ดอกเบี้ยอย่างง่าย", "กลาง", `เงินต้น ${fmt(p)} บาท ดอกเบี้ย ${r}% ต่อปี ${y} ปี ได้ดอกเบี้ยเท่าใด`, `${fmt(x)} บาท`, [`${fmt(x / 2)} บาท`, `${fmt(x + 100)} บาท`, `${fmt(x + 50)} บาท`], `ดอกเบี้ย = ${fmt(p)} × ${r}/100 × ${y} = ${fmt(x)} บาท`, "ไม่ใช่ดอกเบี้ยทบต้น", i)); });
  [[3, 5, 26], [4, 6, 42], [5, 7, 57], [6, 8, 68], [7, 5, 75], [8, 9, 105], [9, 7, 115], [10, 8, 128], [11, 6, 138], [12, 9, 153]].forEach(([a, b, c], i) => { const x = (c - b) / a; all.push(make("math", "สมการ", "กลาง", `ถ้า ${a}x + ${b} = ${c} แล้ว x เท่ากับเท่าใด`, fmt(x), [fmt(x - 1), fmt(x + 1), fmt(x + 2)], `ย้ายค่าคงที่แล้วหารด้วย ${a} ได้ x = ${fmt(x)}`, "ย้ายค่าคงที่ก่อนหาร", i)); });

  // ข้อฝึกเสริม 400 ข้อจากหัวข้อเดิม โดยเปลี่ยนบริบทข้อความและลำดับตัวเลือก
  const source = Array.isArray(window.BATCH7_QUESTIONS) ? window.BATCH7_QUESTIONS.filter((q) => q.subject !== "math") : [];
  if (source.length !== 400) throw new Error(`ชุดที่ 8 ต้องใช้ข้อฝึกเสริม 400 ข้อ แต่พบ ${source.length}`);
  const prefixes = {
    thai: "ข้อฝึกภาษาไทยเพิ่มเติม",
    eng: "Additional English practice",
    goodgov: "สถานการณ์ฝึกงานราชการเพิ่มเติม",
    edu: "สถานการณ์ฝึกวิชาการศึกษาเพิ่มเติม",
    law: "สถานการณ์ฝึกกฎหมายการศึกษาเพิ่มเติม",
    cs: "สถานการณ์ฝึกความรู้คอมพิวเตอร์เพิ่มเติม"
  };
  source.forEach((q, i) => {
    const answer = q.options[q.ans];
    const wrong = q.options.filter((_, index) => index !== q.ans);
    all.push(make(q.subject, q.topic, q.difficulty, `${prefixes[q.subject]} ข้อที่ ${i + 1}: ${q.q}`, answer, wrong, `ทบทวนหลักการเดียวกับโจทย์ฝึกชุดนี้ โดยคำตอบคือ “${answer}”`, q.tip, i + 1));
  });

  const counts = { math: 100, thai: 60, eng: 60, goodgov: 70, edu: 70, law: 70, cs: 70 };
  const actual = Object.fromEntries(Object.keys(counts).map((s) => [s, all.filter((q) => q.subject === s).length]));
  if (all.length !== 500 || Object.entries(counts).some(([s, n]) => actual[s] !== n)) throw new Error(`ชุดที่ 8 จำนวนข้อไม่ตรง: ${JSON.stringify(actual)}`);
  window.BATCH8_QUESTIONS = all.map((q, i) => ({ ...q, id: `sim8-${q.subject}-${String(i + 1).padStart(3, "0")}` }));
})();
