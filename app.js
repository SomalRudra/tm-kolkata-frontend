const WHATSAPP_NUMBER = "918981887910";
const WHATSAPP_BASE_TEXT = "Hi, I have a question about TM Kolkata";
const API_BASE_URL = window.TM_KOLKATA_API_URL || "";

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
const modal = document.querySelector("#question-modal");
const openQuestionButtons = document.querySelectorAll("[data-open-question]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const registrationForm = document.querySelector("#registration");
const questionForm = document.querySelector("#question-form");
const reserveButtons = document.querySelectorAll("[data-reserve-date]");

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setMessage(form, message, isError = false) {
  const messageNode = form.querySelector(".form-message");
  messageNode.textContent = message;
  messageNode.style.color = isError ? "#b33d2f" : "#687a50";
}

function validateForm(form) {
  if (form.checkValidity()) {
    return true;
  }

  form.reportValidity();
  setMessage(form, "Please complete the highlighted fields.", true);
  return false;
}

function persistLead(type, payload) {
  const key = `tmKolkata.${type}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push(payload);
  localStorage.setItem(key, JSON.stringify(existing));
}

async function postIfConfigured(endpoint, payload) {
  if (!API_BASE_URL) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("TM Kolkata API callback failed", error);
  }
}

function triggerJsonCallback(eventName, payload) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  console.info(eventName, JSON.stringify(payload));

  const callbackName = eventName === "tmKolkataRegistration"
    ? "onTMKolkataRegistration"
    : "onTMKolkataQuestion";

  if (typeof window[callbackName] === "function") {
    window[callbackName](payload);
  }
}

function openModal() {
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.querySelector("input").focus();
}

function closeModal() {
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    siteNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

openQuestionButtons.forEach((button) => button.addEventListener("click", openModal));
closeModalButtons.forEach((button) => button.addEventListener("click", closeModal));

reserveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const area = button.dataset.reserveArea;
    const date = button.dataset.reserveDate;
    registrationForm.elements.cityArea.value = area;
    registrationForm.elements.preferredDate.value = date;
    registrationForm.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => registrationForm.elements.fullName.focus(), 500);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
    closeModal();
  }
});

registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(registrationForm)) {
    return;
  }

  const payload = {
    ...formToObject(registrationForm),
    source: "tm-kolkata-landing-page",
    submittedAt: new Date().toISOString()
  };

  persistLead("registrations", payload);
  triggerJsonCallback("tmKolkataRegistration", payload);
  await postIfConfigured("/api/registrations", payload);

  registrationForm.reset();
  setMessage(registrationForm, "Thank you. Your intro talk registration has been received.");
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(questionForm)) {
    return;
  }

  const payload = {
    ...formToObject(questionForm),
    source: "tm-kolkata-whatsapp-lead",
    submittedAt: new Date().toISOString()
  };

  persistLead("questions", payload);
  triggerJsonCallback("tmKolkataQuestion", payload);
  await postIfConfigured("/api/questions", payload);

  const text = encodeURIComponent(`${WHATSAPP_BASE_TEXT}\n\n${payload.question}`);
  window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
});
