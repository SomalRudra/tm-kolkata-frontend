const WHATSAPP_NUMBER = "918981887910";
const WHATSAPP_BASE_TEXT = "Hi, I have a question about Transcendental Meditation Kolkata";
const CLIENT_SITE_URL = "https://tmkolkata.org/";
const ANALYTICS_FUNNEL_URL = window.TM_KOLKATA_ANALYTICS_URL || "https://analytics.tmkolkata.org/";
const EVENT_FEED_URL = window.TM_KOLKATA_EVENTS_URL || ANALYTICS_FUNNEL_URL;
const API_BASE_URL = window.TM_KOLKATA_API_URL || "https://tm-kolkata-backend-production.up.railway.app";

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
const siteHeader = document.querySelector(".site-header");
const modal = document.querySelector("#question-modal");
const videoModal = document.querySelector("#video-modal");
const openQuestionButtons = document.querySelectorAll("[data-open-question]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const openVideoButtons = document.querySelectorAll("[data-open-video]");
const closeVideoButtons = document.querySelectorAll("[data-close-video]");
const registrationSection = document.querySelector("#registration");
const registrationForm = registrationSection.querySelector("form");
const registrationToggle = document.querySelector("[data-toggle-registration]");
const questionForm = document.querySelector("#question-form");
const eventGrid = document.querySelector("#event-grid");
const preferredDateSelect = registrationForm.elements.preferredDate;
const tabButtons = document.querySelectorAll("[role='tab'][data-tab]");
const tabPanels = document.querySelectorAll("[role='tabpanel'][data-panel]");
const testimonials = document.querySelectorAll(".testimonial-card");
const carouselPrev = document.querySelector("[data-carousel-prev]");
const carouselNext = document.querySelector("[data-carousel-next]");
const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
const spySections = Array.from(navLinks)
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
let publishedEvents = [];
let testimonialIndex = 0;
let testimonialTimer = null;

function getNextWeekdayDate(targetWeekday, hour, minute) {
  const date = new Date();
  const daysUntilTarget = (targetWeekday + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilTarget);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function getFallbackEvents() {
  return [
    {
      id: "fallback-bhadreswar",
      title: "Bhadreswar Center Introductory Session",
      event_mode: "In-Person",
      kolkata_region: "Bhadreswar",
      event_date: getNextWeekdayDate(6, 17, 0),
      venue: "Bhadreswar Center | Active In-Person Center",
      description: "A free introductory talk at the local TM center."
    },
    {
      id: "fallback-online",
      title: "Online Zoom Intro Session",
      event_mode: "Virtual",
      kolkata_region: "Online",
      event_date: getNextWeekdayDate(5, 20, 30),
      venue: "Online Zoom",
      description: "Upcoming Friday 8:30 PM IST."
    }
  ];
}

function getTrafficAttribution() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") || "tm-kolkata-frontend";
  const normalizedSource = utmSource.toLowerCase();
  const sourceChannel = params.has("fbclid") || ["facebook", "fb", "meta", "instagram"].includes(normalizedSource)
    ? "Meta Ads"
    : "Direct Web";

  return {
    source_channel: sourceChannel,
    utm_source: utmSource,
    utm_campaign: params.get("utm_campaign") || "public-event-registration"
  };
}

function formToObject(form) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const motivations = formData.getAll("motivation");

  if (motivations.length) {
    payload.motivation = motivations.join(", ");
  }

  return payload;
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

function getDisplayRegion(region) {
  return region === "Salt Lake" ? "Bhadreswar" : region;
}

function getEventModeLabel(event) {
  return event.event_mode === "Virtual"
    ? "Online | Zoom"
    : `In-Person | ${getDisplayRegion(event.kolkata_region)}`;
}

function getEventTimingLabel(event) {
  return event.event_mode === "Virtual"
    ? "Friday 8:30 pm IST"
    : formatEventTime(event.event_date);
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
  if (String(event.id).startsWith("fallback-online")) {
    return "Online Zoom Intro Session - Upcoming Friday 8:30 PM IST";
  }

  if (String(event.id).startsWith("fallback-bhadreswar")) {
    return "Bhadreswar Center | Active In-Person Center";
  }

  return `${formatEventDate(event.event_date)} - ${getDisplayRegion(event.kolkata_region)}`;
}

function renderEvents(events) {
  const sessions = events.length ? events : getFallbackEvents();
  publishedEvents = sessions;
  eventGrid.innerHTML = "";
  preferredDateSelect.innerHTML = '<option value="">Choose a date</option>';

  sessions.forEach((tmEvent) => {
    const option = document.createElement("option");
    option.value = String(tmEvent.id);
    option.textContent = eventLabel(tmEvent);
    preferredDateSelect.append(option);

    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
      <span class="type-tag ${tmEvent.event_mode === "Virtual" ? "online" : ""}">
        ${escapeHtml(getEventModeLabel(tmEvent))}
      </span>
      <h3>${escapeHtml(tmEvent.title)}</h3>
      <div class="event-time">
        <strong>${formatEventDate(tmEvent.event_date)}</strong>
        <span>${escapeHtml(getEventTimingLabel(tmEvent))}</span>
      </div>
      <p>${escapeHtml(tmEvent.event_mode === "Virtual" ? "Live Online Zoom Session (Serving Kolkata &amp; WB)" : tmEvent.venue)}</p>
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
    const response = await fetch(`${EVENT_FEED_URL.replace(/\/$/, "")}/api/events`);
    if (!response.ok) {
      throw new Error(`TM Kolkata event feed returned ${response.status}`);
    }
    const events = await response.json();
    renderEvents(Array.isArray(events) ? events : []);
  } catch (error) {
    try {
      const fallbackEvents = await fetchJson("/api/events");
      renderEvents(Array.isArray(fallbackEvents) ? fallbackEvents : []);
    } catch (fallbackError) {
      console.warn("TM Kolkata event feed failed", error, fallbackError);
      renderEvents([]);
    }
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

function openVideoModal() {
  videoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  videoModal.querySelector(".modal-close").focus();
}

function closeVideoModal() {
  videoModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function setRegistrationOpen(isOpen) {
  registrationSection.classList.toggle("is-open", isOpen);
  registrationForm.hidden = !isOpen;
  if (registrationToggle) {
    registrationToggle.setAttribute("aria-expanded", String(isOpen));
    registrationToggle.textContent = isOpen ? "Hide Registration Form" : "Register Free For TM Course";
  }
}

function openRegistrationForm({ scroll = true, focusFirstField = false } = {}) {
  setRegistrationOpen(true);
  registrationSection.classList.add("is-highlighted");
  window.setTimeout(() => registrationSection.classList.remove("is-highlighted"), 1400);
  if (scroll) {
    registrationSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (focusFirstField) {
    window.setTimeout(() => registrationForm.elements.fullName.focus(), 350);
  }
}

setRegistrationOpen(false);
activateTab("stress");
showTestimonial(0);

function updateHeaderState() {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 50);
}

function updateActiveNavLink() {
  const marker = window.innerHeight * 0.35;
  let activeHref = "";

  spySections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= marker && rect.bottom > marker) {
      activeHref = `#${section.id}`;
    }
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === activeHref;
    link.classList.toggle("is-active", isActive);
  });
}

function setMobileMenuOpen(isOpen) {
  siteNav.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}

function activateTab(tabName) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function showTestimonial(nextIndex) {
  if (!testimonials.length) {
    return;
  }

  testimonialIndex = (nextIndex + testimonials.length) % testimonials.length;
  testimonials.forEach((card, index) => {
    card.classList.toggle("is-active", index === testimonialIndex);
  });
}

function startTestimonialAutoplay() {
  if (testimonialTimer || testimonials.length < 2) {
    return;
  }

  testimonialTimer = window.setInterval(() => {
    showTestimonial(testimonialIndex + 1);
  }, 5000);
}

function resetTestimonialAutoplay() {
  if (testimonialTimer) {
    window.clearInterval(testimonialTimer);
    testimonialTimer = null;
  }
  startTestimonialAutoplay();
}

navToggle.addEventListener("click", () => {
  const isOpen = !siteNav.classList.contains("is-open");
  setMobileMenuOpen(isOpen);
});

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("scroll", updateActiveNavLink, { passive: true });
updateHeaderState();
updateActiveNavLink();

siteNav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    closeMobileMenu();
  }
});

document.addEventListener("click", (event) => {
  if (!siteNav.classList.contains("is-open")) {
    return;
  }

  if (siteNav.contains(event.target) || navToggle.contains(event.target)) {
    return;
  }

  closeMobileMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 992) {
    closeMobileMenu();
  }
});

openQuestionButtons.forEach((button) => button.addEventListener("click", openModal));
closeModalButtons.forEach((button) => button.addEventListener("click", closeModal));
openVideoButtons.forEach((button) => button.addEventListener("click", openVideoModal));
closeVideoButtons.forEach((button) => button.addEventListener("click", closeVideoModal));

tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

const benefitTabList = document.querySelector(".benefit-tabs [role='tablist']");
if (benefitTabList) {
  benefitTabList.addEventListener("click", (event) => {
    const tab = event.target.closest("[role='tab'][data-tab]");
    if (tab) {
      activateTab(tab.dataset.tab);
    }
  });
}

document.querySelectorAll(".accordion details").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) {
      return;
    }

    document.querySelectorAll(".accordion details").forEach((otherDetails) => {
      if (otherDetails !== details) {
        otherDetails.open = false;
      }
    });
  });
});

if (carouselPrev && carouselNext) {
  carouselPrev.addEventListener("click", () => {
    showTestimonial(testimonialIndex - 1);
    resetTestimonialAutoplay();
  });
  carouselNext.addEventListener("click", () => {
    showTestimonial(testimonialIndex + 1);
    resetTestimonialAutoplay();
  });
}

startTestimonialAutoplay();

document.querySelectorAll('a[href="#registration"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openRegistrationForm({ scroll: true, focusFirstField: true });
  });
});

if (registrationToggle) {
  registrationToggle.addEventListener("click", () => {
    const isOpen = registrationSection.classList.contains("is-open");
    setRegistrationOpen(!isOpen);
    if (!isOpen) {
      registrationSection.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => registrationForm.elements.fullName.focus(), 350);
    }
  });
}

eventGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-id]");
  if (!button) {
    return;
  }

  const tmEvent = publishedEvents.find((item) => String(item.id) === button.dataset.eventId);
  if (tmEvent) {
    trackAnalyticsFunnel("reserve_seat_clicked", {
      event_id: tmEvent.id,
      kolkata_region: getDisplayRegion(tmEvent.kolkata_region),
      event_date: tmEvent.event_date,
      event_mode: tmEvent.event_mode
    });
    registrationForm.elements.cityArea.value = tmEvent.event_mode === "Virtual"
      ? "Online"
      : getDisplayRegion(tmEvent.kolkata_region);
    preferredDateSelect.value = String(tmEvent.id);
    openRegistrationForm({ scroll: true, focusFirstField: true });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
    closeMobileMenu();
  }
  if (event.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
    closeModal();
  }
  if (event.key === "Escape" && videoModal.getAttribute("aria-hidden") === "false") {
    closeVideoModal();
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
    ...getTrafficAttribution(),
    event_id: selectedEvent.id,
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    city_state: payload.cityState,
    kolkata_region: getDisplayRegion(selectedEvent.kolkata_region),
    event_date: selectedEvent.event_date,
    event_mode: selectedEvent.event_mode,
    bucket: "BUCKET_B_REGISTERED",
    age_group: payload.ageGroup,
    occupation: payload.occupation,
    heard_about: payload.heardAbout,
    motivation: payload.motivation,
    prior_meditation: payload.priorMeditation,
    prior_meditation_types: payload.priorMeditationTypes,
    current_challenge: payload.currentChallenge,
    stress_level: payload.stressLevel,
    practice_commitment: payload.practiceCommitment,
    best_contact_time: payload.bestContactTime,
    future_updates: payload.futureUpdates,
    pre_session_questions: payload.preSessionQuestions
  };

  persistLead("registrations", registrationPayload);
  triggerJsonCallback("tmKolkataRegistration", registrationPayload);
  trackAnalyticsFunnel("registration_submitted", registrationPayload);
  await postIfConfigured("/api/leads/register", registrationPayload);

  registrationForm.reset();
  setRegistrationOpen(false);
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
    source_channel: getTrafficAttribution().source_channel,
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
