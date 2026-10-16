// ปรับตัวลวงของข้อสอบเสมือนจริงให้ใกล้เคียงกับเนื้อหาในหัวข้อเดียวกัน
// ใช้กับข้อสอบเสมือนจริงเท่านั้น ไม่แก้ข้อสอบที่ระบุว่าเป็นข้อสอบจริง
(() => {
  const sources = [
    window.SIMULATED_QUESTIONS,
    window.EXTRA_QUESTIONS,
    window.BATCH4_QUESTIONS,
    window.BATCH5_QUESTIONS,
    window.BATCH6_QUESTIONS,
    window.BATCH7_QUESTIONS,
    window.BATCH8_QUESTIONS,
  ].filter(Array.isArray);
  const questions = sources.flat();
  if (!questions.length) return;

  const clean = (value) => String(value ?? "").trim();
  const key = (value) => clean(value).toLocaleLowerCase();
  const unique = (values) => {
    const seen = new Set();
    return values.filter((value) => {
      const id = key(value);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };
  const tokens = (value) => clean(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/u)
    .filter((token) => token.length > 1);
  const wordCount = (value) => tokens(value).length;
  const hasNumber = (value) => /\d/u.test(clean(value));
  const overlapScore = (value, context) => {
    const candidate = new Set(tokens(value));
    return tokens(context).reduce((score, token) => score + (candidate.has(token) ? 1 : 0), 0);
  };
  const shapeScore = (value, question) => {
    const candidate = clean(value);
    const prompt = clean(question.q);
    let score = 0;
    if (candidate.length <= 60) score += 1;
    if (candidate.length > 90) score -= 3;
    if (candidate.includes("→")) score -= 3;
    if (/หลักการ|สอดคล้อง|สะท้อน|คุณสมบัติ|หมายถึง|เรียกว่า|ระดับใด|ขั้นใด|สิ่งใด|ประโยชน์/u.test(prompt)) {
      if (!/[.!?]/u.test(candidate)) score += 2;
      if (/ควร|รายงาน|ตรวจสอบ|เปิดเผย|ดำเนินการ|ประสาน|แจ้ง|ขอถอนตัว|ส่งต่อ/u.test(candidate)) score -= 1;
    }
    if (/ควรทำอย่างไร|ทำอย่างไร|ควรดำเนินการ|แนวทาง/u.test(prompt)) {
      if (/ควร|ตรวจสอบ|รายงาน|เปิดเผย|ดำเนินการ|ประสาน|แจ้ง|ขอ|ใช้|กำหนด|เข้าบริการ|ปฏิเสธ/u.test(candidate)) score += 2;
      if (/กดลิงก์ทันที|ส่งรหัสผ่าน|ส่งต่อ|ปกปิด|ลบเอกสาร|ทำลายหลักฐาน|ทำทันที/u.test(candidate)) score -= 4;
    }
    if (/กฎหมายใด|องค์กรใด|ใคร|คำราชาศัพท์ของ|คำไวพจน์ของ/u.test(prompt) && candidate.length <= 30) score += 2;
    if (/การประเมิน|การเรียนรู้|วิธีสอน|ทฤษฎี|แนวคิด/u.test(prompt) && /ประเมิน|เรียนรู้|สอน|ทฤษฎี|แนวคิด/u.test(candidate)) score += 3;
    if (/รหัสผ่าน|ฟิชชิง|อีเมล|เว็บไซต์|ข้อมูล|สำรอง|เครือข่าย|สูตร|ไฟล์/u.test(prompt) && /รหัส|ตรวจสอบ|ข้อมูล|เว็บไซต์|บัญชี|สิทธิ์|สำรอง|การเข้ารหัส|การเชื่อมต่อ|สูตร/u.test(candidate)) score += 2;
    return score;
  };
  const compatibleShape = (answer, candidate, question) => {
    const answerWords = wordCount(answer);
    const candidateWords = wordCount(candidate);
    const prompt = clean(question.q);
    if (key(answer) === key(candidate)) return false;
    if (hasNumber(answer) !== hasNumber(candidate)) return false;
    if (answer.includes("→") !== candidate.includes("→")) return false;
    const answerTokens = new Set(tokens(answer));
    const candidateTokens = new Set(tokens(candidate));
    const normalizedAnswer = key(answer).replace(/\s+/gu, "");
    const normalizedCandidate = key(candidate).replace(/\s+/gu, "");
    if (normalizedCandidate.includes(normalizedAnswer) && normalizedCandidate.length <= normalizedAnswer.length + 24) return false;
    if (normalizedAnswer.includes(normalizedCandidate) && normalizedAnswer.length <= normalizedCandidate.length + 24) return false;
    const shared = [...answerTokens].filter((token) => candidateTokens.has(token)).length;
    const similarity = shared / Math.max(1, Math.min(answerTokens.size, candidateTokens.size));
    if (shared === answerTokens.size && candidateTokens.size <= answerTokens.size + 4) return false;
    if (similarity >= 0.85 && Math.abs(answerTokens.size - candidateTokens.size) <= 1) return false;
    if (hasNumber(answer)) return true;
    if (/เขียนถูกต้อง|เขียนคำ|สะกด|คำใด/u.test(prompt) && candidateWords !== answerWords) return false;
    if (answerWords >= 2 && candidateWords < 2 && !/หลักการ|กฎหมายใด|องค์กรใด|ใคร|คำราชาศัพท์|คำไวพจน์/u.test(prompt)) return false;
    if (answerWords >= 6 && candidateWords < 3 && !/หลักการ|สอดคล้อง|สะท้อน|คุณสมบัติ|หมายถึง|เรียกว่า/u.test(prompt)) return false;
    if (answerWords <= 2 && candidateWords > 6) return false;
    return true;
  };
  const numberValue = (value) => {
    const text = clean(value).replace(/,/g, "");
    if (/^\s*-?\d+(?:\.\d+)?\s*\/\s*-?\d+\s*$/u.test(text)) return null;
    const match = text.match(/-?\d+(?:\.\d+)?/u);
    return match ? Number(match[0]) : null;
  };
  const suffixOf = (value) => clean(value).replace(/^[^\d-]?-?[\d,]+(?:\.\d+)?/u, "").trim();
  const formatNumberLike = (number, original) => {
    const rounded = Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
    const suffix = suffixOf(original);
    return suffix ? `${rounded}${original.includes(" ") ? " " : ""}${suffix}` : rounded;
  };
  const rotateWithAnswerAt = (answer, distractors, answerIndex) => {
    const values = unique([answer, ...distractors]).slice(0, 4);
    if (values.length !== 4) return null;
    const options = values.filter((value) => key(value) !== key(answer));
    options.splice(Math.max(0, Math.min(3, answerIndex)), 0, answer);
    return { options, ans: options.indexOf(answer) };
  };

  const groups = new Map();
  const groupOptions = new Map();
  const subjectOptions = new Map();
  const groupAnswers = new Map();
  const subjectAnswers = new Map();
  for (const question of questions) {
    const groupKey = `${question.subject}::${question.topic}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(question);
    if (!groupOptions.has(groupKey)) groupOptions.set(groupKey, []);
    groupOptions.get(groupKey).push(...question.options);
    if (!groupAnswers.has(groupKey)) groupAnswers.set(groupKey, []);
    groupAnswers.get(groupKey).push(question.options[question.ans]);
    if (!subjectOptions.has(question.subject)) subjectOptions.set(question.subject, []);
    subjectOptions.get(question.subject).push(...question.options);
    if (!subjectAnswers.has(question.subject)) subjectAnswers.set(question.subject, []);
    subjectAnswers.get(question.subject).push(question.options[question.ans]);
  }
  const subjectGroups = new Map();
  for (const question of questions) {
    if (!subjectGroups.has(question.subject)) subjectGroups.set(question.subject, []);
    subjectGroups.get(question.subject).push(question);
  }

  const choosePoolDistractors = (question, answer, existingWrong, count) => {
    const context = `${question.q} ${question.exp || ""} ${answer}`;
    const prompt = clean(question.q);
    if (/เขียนถูกต้อง|เขียนคำ|สะกด/u.test(prompt)) {
      // ข้อสะกดคำต้องใช้ตัวลวงที่ผิดรูปคำเท่านั้น ไม่ดึงคำตอบจากข้ออื่น
      // เพราะคำที่ถูกต้องจากข้ออื่นอาจกลายเป็นตัวเลือกถูกซ้ำโดยไม่ตั้งใจ
      return unique(existingWrong).filter((candidate) => key(candidate) !== key(answer)).slice(0, count);
    }
    if (/localstorage/i.test(prompt)) {
      return unique([
        "ข้อมูลลับที่ต้องซิงก์ทุกเครื่อง",
        "ข้อมูลขนาดใหญ่ที่ต้องค้นหาร่วมกันหลายผู้ใช้",
        "ข้อมูลชั่วคราวที่ต้องล้างเมื่อปิดแท็บ",
        ...existingWrong,
      ]).filter((candidate) => key(candidate) !== key(answer)).slice(0, count);
    }
    if (/หนังสือราชการ/u.test(prompt)) {
      return unique([
        "ชัดเจน กระชับ สุภาพ แต่ไม่ต้องระบุผู้รับผิดชอบ",
        "ใช้ภาษาพูดเพื่อให้เป็นกันเองกับผู้รับ",
        "ระบุเฉพาะข้อสรุปโดยไม่ต้องแสดงรายละเอียดที่เกี่ยวข้อง",
        ...existingWrong,
      ]).filter((candidate) => key(candidate) !== key(answer)).slice(0, count);
    }
    if (/ข้อมูลป้อนกลับ.*พัฒนา/u.test(prompt)) {
      return unique([
        "ทำได้ดี แต่ควรอธิบายเหตุผลของคำตอบให้ชัดขึ้น",
        "คำตอบยังไม่ถูกต้อง ควรกลับไปอ่านบทเรียนใหม่ทั้งหมด",
        "ได้คะแนนดีมาก จึงไม่จำเป็นต้องปรับปรุงอะไร",
        ...existingWrong,
      ]).filter((candidate) => key(candidate) !== key(answer)).slice(0, count);
    }
    const topicAnswers = groupAnswers.get(`${question.subject}::${question.topic}`) || [];
    const subjectAnswersForQuestion = subjectAnswers.get(question.subject) || [];
    const topicCandidates = groupOptions.get(`${question.subject}::${question.topic}`) || [];
    const subjectCandidates = subjectOptions.get(question.subject) || [];
    const current = unique(existingWrong)
      .filter((candidate) => key(candidate) !== key(answer))
      .filter((candidate) => compatibleShape(answer, candidate, question))
      .sort((a, b) => shapeScore(b, question) - shapeScore(a, question));

    // Keep one original distractor when it is reasonably related, then use
    // answers/options from the same topic to avoid unrelated throwaways.
    const relatedExisting = current.find((candidate) => overlapScore(candidate, context) > 0) || current[0];
    const rankedPool = unique([...topicAnswers, ...subjectAnswersForQuestion.slice(0, 60), ...current])
      .filter((candidate) => key(candidate) !== key(answer))
      .filter((candidate) => compatibleShape(answer, candidate, question))
      .sort((a, b) => shapeScore(b, question) - shapeScore(a, question));
    return unique([relatedExisting, ...rankedPool])
      .filter((candidate) => key(candidate) !== key(answer))
      .slice(0, count);
  };

  const hardenMath = (question, answer, wrong) => {
    const answerNumber = numberValue(answer);
    if (answerNumber === null || !Number.isFinite(answerNumber)) {
      return choosePoolDistractors(question, answer, wrong, 3);
    }
    const originalNumber = wrong.map(numberValue).filter((value) => value !== null && Number.isFinite(value));
    const step = Math.max(1, Math.round(Math.abs(answerNumber) * 0.05));
    const close = [
      formatNumberLike(answerNumber - step, answer),
      formatNumberLike(answerNumber + step, answer),
      formatNumberLike(answerNumber + (answerNumber >= 0 ? step * 2 : -step * 2), answer),
      ...wrong.filter((value) => numberValue(value) !== null),
    ];
    const ordered = unique(close).filter((value) => key(value) !== key(answer));
    // Retain a recognisable calculation error if it is closer than a generated value.
    ordered.sort((a, b) => Math.abs((numberValue(a) ?? Infinity) - answerNumber) - Math.abs((numberValue(b) ?? Infinity) - answerNumber));
    return unique([...ordered, ...originalNumber.map((value) => formatNumberLike(value, answer))]).slice(0, 3);
  };

  const hardenEnglish = (question, answer, wrong) => {
    const text = `${question.q} ${answer}`.toLocaleLowerCase();
    let pool = [];
    if (/\bif\b/u.test(text)) pool = ["had", "have", "were", "would", "will", "would have", "could"];
    else if (/\bby the time\b|\byesterday\b|\blast\b/u.test(text)) pool = ["had started", "started", "has started", "was starting", "will start"];
    else if (/\binterested\b|\bafraid\b|\bdepend\b|\bgood\b|\bfamous\b/u.test(text)) pool = ["in", "at", "on", "for", "to", "of"];
    else if (/\bneither\b|\beither\b|\beach\b|\bevery\b|\bthe teacher\b/u.test(text)) pool = ["is", "are", "was", "were", "has", "have"];
    else if (/\bmust\b|\bshould\b|\bmay\b|\bmight\b|\bcan\b|\bcould\b/u.test(text)) pool = ["must", "should", "may", "might", "can", "could", "would"];
    return unique([...choosePoolDistractors(question, answer, wrong, 3), ...pool])
      .filter((value) => key(value) !== key(answer))
      .slice(0, 3);
  };

  for (const question of questions) {
    if (question.type !== "simulated" || !Array.isArray(question.options) || question.options.length !== 4) continue;
    const answer = clean(question.options[question.ans]);
    const wrong = question.options.filter((_, index) => index !== question.ans);
    let distractors;
    if (question.subject === "math") distractors = hardenMath(question, answer, wrong);
    else if (question.subject === "eng") distractors = hardenEnglish(question, answer, wrong);
    else distractors = choosePoolDistractors(question, answer, wrong, 3);

    const rebuilt = rotateWithAnswerAt(answer, distractors, question.ans);
    if (rebuilt) {
      question.options = rebuilt.options;
      question.ans = rebuilt.ans;
      question.distractorQuality = "หัวข้อเดียวกันและมีตัวลวงใกล้เคียง v1";
    } else question.distractorQuality = "คงตัวเลือกเดิมที่ตรวจแล้ว";
  }
})();
