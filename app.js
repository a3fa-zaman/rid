/* ============================================================
   থিম কন্ট্রোল (ডার্ক/লাইট মুড)
   ============================================================ */
const themeToggle = document.getElementById("themeToggle");
const currentTheme = localStorage.getItem("theme") || "dark";

// ডিফল্ট থিম সেট করা (ডার্ক)
document.documentElement.setAttribute("data-theme", currentTheme);

themeToggle.addEventListener("click", () => {
  let theme = document.documentElement.getAttribute("data-theme");
  let newTheme = theme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});

/* ============================================================
   তথ্য নিবন্ধন পোর্টাল — ফরম লজিক ও Google Sheets সংযোগ
   ------------------------------------------------------------
   নিচের SCRIPT_URL-এ আপনার Google Apps Script Web App এর URL বসান।
   (Apps Script এডিটর → Deploy → New deployment → Web app →
    Execute as: Me, Who has access: Anyone → Deploy → কপি করা /exec লিংক)
   ============================================================ */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyW31i0J8SS089g8X7p9eUOR2JU1hrZJKjAKcRhWC0XcI3CR7hpeHDvd4_c_VmnHr1a/exec";

/* ডোম রেফারেন্স */
const form = document.getElementById("memberForm");
const phoneInput = document.getElementById("phone");
const submitBtn = document.getElementById("submitBtn");

/* ---------- ফোন নম্বরে +৮৮ বজায় রাখা ---------- */
phoneInput.addEventListener("input", (e) => {
  let val = e.target.value;
  if (!val.startsWith("+88")) {
    e.target.value = "+88" + val.replace(/^\+?88?/, "");
  }
});

const sectorBlock = document.getElementById("sectorBlock");
const contributionBlock = document.getElementById("contributionBlock");
const modal = document.getElementById("successModal");
const modalClose = document.getElementById("modalClose");

const SECTOR_GROUPS = ["রিলেশনশিপ", "ফাইন্যান্স", "হাইকোর্ট"];

/* ---------- বাংলা সংখ্যা → ইংরেজি সংখ্যা ---------- */
function toEnglishDigits(str) {
  const bn = "০১২৩৪৫৬৭৮৯";
  return String(str).replace(/[০-৯]/g, (d) => bn.indexOf(d));
}

/* ---------- এরর দেখানো / মুছে ফেলা ---------- */
function setError(fieldName, message) {
  const el = document.querySelector(`[data-err-for="${fieldName}"]`);
  if (el) el.textContent = message || "";
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (input) {
    const wrap = input.closest(".field");
    if (wrap) wrap.classList.toggle("invalid", Boolean(message));
  }
}

function clearAllErrors() {
  form.querySelectorAll(".err").forEach((el) => (el.textContent = ""));
  form.querySelectorAll(".field.invalid").forEach((el) => el.classList.remove("invalid"));
}

/* ---------- সেক্টর ব্লক দেখানো / লুকানো ---------- */
function toggleSectorBlock() {
  const active = form.querySelector('[name="সক্রিয় সদস্য"]:checked');
  const wantActive = active && active.value === "হ্যাঁ";
  sectorBlock.hidden = !wantActive;
  if (!wantActive) {
    SECTOR_GROUPS.forEach((g) => {
      form.querySelectorAll(`[name="${g}"]`).forEach((r) => (r.checked = false));
      setError(g, "");
    });
    setError("sectorBlock", "");
  }
}

/* ---------- সহযোগিতার ঘর দেখানো / লুকানো ---------- */
function toggleContributionBlock() {
  const financial = form.querySelector('[name="আর্থিকভাবে যুক্ত"]:checked');
  const canContribute = financial && financial.value === "হ্যাঁ";
  contributionBlock.hidden = !canContribute;
  if (!canContribute) {
    form.elements["সহযোগিতার পরিমাণ"].value = "";
    setError("contribution", "");
  }
}

form.querySelectorAll('[name="সক্রিয় সদস্য"]').forEach((r) => {
  r.addEventListener("change", toggleSectorBlock);
});

form.querySelectorAll('[name="আর্থিকভাবে যুক্ত"]').forEach((r) => {
  r.addEventListener("change", toggleContributionBlock);
});

/* ---------- ভ্যালিডেশন ---------- */
function validateForm() {
  clearAllErrors();
  let firstInvalid = null;
  const fail = (name, msg, el) => {
    setError(name, msg);
    if (!firstInvalid) firstInvalid = el || form.querySelector(`[name="${name}"]`);
  };

  const name = form.elements["নাম"].value.trim();
  if (!name) fail("নাম", "নাম লিখুন।", document.getElementById("name"));
  else if (name.length < 3) fail("নাম", "নাম অন্তত ৩ অক্ষরের হতে হবে।", document.getElementById("name"));

  const designation = document.getElementById("designation").value;
  if (!designation) fail("পদবী", "পদবী নির্বাচন করুন।", document.getElementById("designation"));

  const phoneRaw = toEnglishDigits(form.elements["যোগাযোগ নম্বর"].value).replace(/[\s\-()]/g, "");
  if (!phoneRaw || phoneRaw === "+88") fail("যোগাযোগ নম্বর", "যোগাযোগ নম্বর দিন।", document.getElementById("phone"));
  else if (!/^\+8801[3-9]\d{8}$/.test(phoneRaw))
    fail("যোগাযোগ নম্বর", "সঠিক মোবাইল নম্বর দিন (যেমন: +88017XXXXXXXX)।", document.getElementById("phone"));

  if (!form.elements["শাখা"].value.trim())
    fail("শাখা", "কর্মরত শাখার নাম লিখুন।", document.getElementById("branch"));

  if (!form.elements["অঞ্চল"].value.trim())
    fail("অঞ্চল", "কর্মরত অঞ্চলের নাম লিখুন।", document.getElementById("region"));

  if (!form.querySelector('[name="রিটের পক্ষে"]:checked'))
    fail("রিটের পক্ষে", "একটি অপশন নির্বাচন করুন।");
  const financial = form.querySelector('[name="আর্থিকভাবে যুক্ত"]:checked');
  if (!financial) fail("আর্থিকভাবে যুক্ত", "একটি অপশন নির্বাচন করুন।");

  if (financial && financial.value === "হ্যাঁ") {
    const contribution = toEnglishDigits(form.elements["সহযোগিতার পরিমাণ"].value).replace(/[^0-9]/g, "");
    if (!contribution) fail("contribution", "সহযোগিতার পরিমাণ লিখুন।", document.getElementById("contribution"));
  }

  const district = document.getElementById("district").value;
  if (!district) fail("district", "নিজ জেলা নির্বাচন করুন।", document.getElementById("district"));

  if (!form.querySelector('[name="পরিচয়ের গোপনীয়তা"]:checked'))
    fail("পরিচয়ের গোপনীয়তা", "একটি অপশন নির্বাচন করুন।");

  const active = form.querySelector('[name="সক্রিয় সদস্য"]:checked');
  if (!active) fail("সক্রিয় সদস্য", "একটি অপশন নির্বাচন করুন।");

  if (active && active.value === "হ্যাঁ") {
    const chosen = SECTOR_GROUPS.filter((g) => form.querySelector(`[name="${g}"]:checked`));
    if (chosen.length === 0) {
      setError("sectorBlock", "সক্রিয় সদস্য হতে চাইলে অন্তত একটি সেক্টরে ভূমিকা নির্বাচন করুন।");
      if (!firstInvalid) firstInvalid = sectorBlock;
    }
  }

  const email = form.elements["ইমেইল"].value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    fail("ইমেইল", "সঠিক ইমেইল ঠিকানা লিখুন।", document.getElementById("email"));

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return !firstInvalid;
}

/* ---------- ফরম ডেটা সংগ্রহ ---------- */
function collectData() {
  const checked = (name) => {
    const el = form.querySelector(`[name="${name}"]:checked`);
    return el ? el.value : "";
  };

  return {
    "নাম": form.elements["নাম"].value.trim(),
    "পদবী": document.getElementById("designation").value,
    "যোগাযোগ নম্বর": toEnglishDigits(form.elements["যোগাযোগ নম্বর"].value).trim(),
    "শাখা": form.elements["শাখা"].value.trim(),
    "অঞ্চল": form.elements["অঞ্চল"].value.trim(),
    "রিটের পক্ষে": checked("রিটের পক্ষে"),
    "আর্থিকভাবে যুক্ত": checked("আর্থিকভাবে যুক্ত"),
    "সহযোগিতার পরিমাণ": toEnglishDigits(form.elements["সহযোগিতার পরিমাণ"].value).trim(),
    "নিজ জেলা": document.getElementById("district").value,
    "পরিচয়ের গোপনীয়তা": checked("পরিচয়ের গোপনীয়তা"),
    "সক্রিয় সদস্য": checked("সক্রিয় সদস্য"),
    "রিলেশনশিপ": checked("রিলেশনশিপ") || "প্রযোজ্য নয়",
    "ফাইন্যান্স": checked("ফাইন্যান্স") || "প্রযোজ্য নয়",
    "হাইকোর্ট": checked("হাইকোর্ট") || "প্রযোজ্য নয়",
    "ইমেইল": form.elements["ইমেইল"].value.trim(),
    "অতিরিক্ত মতামত": form.elements["অতিরিক্ত মতামত"].value.trim()
  };
}

/* ---------- মোডাল ---------- */
function openModal() {
  modal.hidden = false;
  modalClose.focus();
}
function closeModal() {
  modal.hidden = true;
}
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

/* ---------- সাবমিট ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  if (!SCRIPT_URL || SCRIPT_URL.indexOf("PASTE_YOUR") === 0) {
    alert(
      "সেটআপ বাকি আছে: app.js ফাইলের SCRIPT_URL ভেরিয়েবলে আপনার Google Apps Script Web App URL বসান।\n" +
      "ততক্ষণ পর্যন্ত ডেটা কোথাও সংরক্ষণ হবে না।"
    );
    return;
  }

  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "জমা হচ্ছে...";

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      // text/plain ব্যবহার করলে CORS preflight এড়ানো যায়; Apps Script এ e.postData.contents দিয়ে পড়া হবে
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(collectData())
    });

    form.reset();
    phoneInput.value = "+88";
    toggleSectorBlock();
    toggleContributionBlock();
    clearAllErrors();
    openModal();
  } catch (err) {
    console.error("সাবমিট ব্যর্থ:", err);
    alert("দুঃখিত, তথ্য পাঠানো যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

/* ইনপুট দিলে সাথে সাথে এরর মুছে যাবে */
form.addEventListener("input", (e) => {
  const field = e.target.closest(".field");
  if (field && field.classList.contains("invalid")) {
    field.classList.remove("invalid");
    const err = field.querySelector(".err");
    if (err) err.textContent = "";
  }
});

/* ---------- মেনু থেকে স্ক্রল (sticky হেডারের জন্য অফসেট) ---------- */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    const offset = link.getAttribute("href") === "#top" ? 0 : 74;
    const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  });
});

toggleSectorBlock();
toggleContributionBlock();
