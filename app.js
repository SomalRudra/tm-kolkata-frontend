const WHATSAPP_NUMBER = "918981887910";
const WHATSAPP_BASE_TEXT = "Hi, I have a question about TM Kolkata";
const CLIENT_SITE_URL = "https://tmkolkata.org/";
const ANALYTICS_FUNNEL_URL = window.TM_KOLKATA_ANALYTICS_URL || "https://tmkolkata.org/analyticFunnel";
const API_BASE_URL = window.TM_KOLKATA_API_URL || "https://tm-kolkata-backend-production.up.railway.app";

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
const modal = document.querySelector("#question-modal");
const openQuestionButtons = document.querySelectorAll("[data-open-question]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const registrationForm = document.querySelector("#registration");
const questionForm = document.querySelector("#question-form");
const eventGrid = document.querySelector("#event-grid");
const preferredDateSelect = registrationForm.elements.preferredDate;
let publishedEvents = [];

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

function trackAnalyticsFunnel(eventName, payload = {}) {
  const body = JSON.stringify({
    event_name: eventName,
    client_site_url: CLIENT_SITE_URL,
    page_url: window.location.href,
    page_path: window.location.pathname,
    occurred_at: new Date().toISOString(),
    payload
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(ANALYTICS_FUNNEL_URL, blob)) {
        return;
      }
    }

    fetch(ANALYTICS_FUNNEL_URL, {
      method: "POST",
      mode: "no-cors",
      body,
      keepalive: true
    }).catch((error) => {
      console.warn("TM Kolkata analytics funnel callback failed", error);
    });
  } catch (error) {
    console.warn("TM Kolkata analytics funnel callback failed", error);
  }
}

async function fetchJson(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`TM Kolkata API returned ${response.status}`);
  }
  return response.json();
}

function formatEventDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatEventTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[character]);
}

function eventLabel(event) {
  return `${formatEventDate(event.event_date)} - ${event.kolkata_region}`;
}

function renderEvents(events) {
  publishedEvents = events;
  eventGrid.innerHTML = "";
  preferredDateSelect.innerHTML = '<option value="">Choose a date</option>';

  if (!events.length) {
    eventGrid.innerHTML = '<p class="event-empty">No upcoming sessions are open for registration right now.</p>';
    return;
  }

  events.forEach((tmEvent) => {
    const option = document.createElement("option");
    option.value = String(tmEvent.id);
    option.textContent = eventLabel(tmEvent);
    preferredDateSelect.append(option);

    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
      <span class="type-tag ${tmEvent.event_mode === "Virtual" ? "online" : ""}">
        ${escapeHtml(tmEvent.event_mode)} | ${escapeHtml(tmEvent.kolkata_region)}
      </span>
      <h3>${escapeHtml(tmEvent.title)}</h3>
      <div class="event-time">
        <strong>${formatEventDate(tmEvent.event_date)}</strong>
        <span>${formatEventTime(tmEvent.event_date)}</span>
      </div>
      <p>${escapeHtml(tmEvent.venue)}</p>
      ${tmEvent.description ? `<p>${escapeHtml(tmEvent.description)}</p>` : ""}
      <button class="button primary reserve-button" type="button" data-event-id="${tmEvent.id}">
        Reserve Seat
      </button>
    `;
    eventGrid.append(card);
  });
}

async function loadEvents() {
  try {
    renderEvents(await fetchJson("/api/events"));
  } catch (error) {
    console.warn("TM Kolkata event feed failed", error);
    renderEvents([]);
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

eventGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-id]");
  if (!button) {
    return;
  }

  const tmEvent = publishedEvents.find((item) => String(item.id) === button.dataset.eventId);
  if (tmEvent) {
    trackAnalyticsFunnel("reserve_seat_clicked", {
      event_id: tmEvent.id,
      kolkata_region: tmEvent.kolkata_region,
      event_date: tmEvent.event_date,
      event_mode: tmEvent.event_mode
    });
    registrationForm.elements.cityArea.value = tmEvent.kolkata_region;
    preferredDateSelect.value = String(tmEvent.id);
    registrationForm.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => registrationForm.elements.fullName.focus(), 500);
  }
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
    ...formToObject(registrationForm)
  };
  const selectedEvent = publishedEvents.find((tmEvent) => String(tmEvent.id) === payload.preferredDate);
  if (!selectedEvent) {
    setMessage(registrationForm, "Please choose an available event.", true);
    return;
  }
  const registrationPayload = {
    event_id: selectedEvent.id,
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    kolkata_region: selectedEvent.kolkata_region,
    event_date: selectedEvent.event_date,
    event_mode: selectedEvent.event_mode,
    source_channel: "Direct Web",
    utm_source: "tm-kolkata-frontend",
    utm_campaign: "public-event-registration",
    bucket: "BUCKET_B_REGISTERED"
  };

  persistLead("registrations", registrationPayload);
  triggerJsonCallback("tmKolkataRegistration", registrationPayload);
  trackAnalyticsFunnel("registration_submitted", registrationPayload);
  await postIfConfigured("/api/leads/register", registrationPayload);

  registrationForm.reset();
  setMessage(registrationForm, "Thank you. Your intro talk registration has been received.");
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(questionForm)) {
    return;
  }

  const payload = {
    ...formToObject(questionForm)
  };
  const inquiryPayload = {
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    question_text: payload.question,
    source_channel: "Direct Web",
    bucket: "BUCKET_A_UNCONVERTED",
    redirected_to_whatsapp: true
  };

  persistLead("questions", inquiryPayload);
  triggerJsonCallback("tmKolkataQuestion", inquiryPayload);
  trackAnalyticsFunnel("whatsapp_inquiry_submitted", inquiryPayload);
  await postIfConfigured("/api/leads/inquiry", inquiryPayload);

  const whatsappMessage = [
    WHATSAPP_BASE_TEXT,
    "",
    `Name: ${payload.fullName}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    "",
    "Question:",
    payload.question
  ].join("\n");
  const text = encodeURIComponent(whatsappMessage);
  window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
});

loadEvents();
