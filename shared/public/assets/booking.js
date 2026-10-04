(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var TZ = 'Europe/London';
  var PREVIEW = window.location.protocol === 'file:' || window.__REVERIE_PREVIEW__ === true;

  function fmtWhen(iso) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'content-type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  // Preview builds (no server) get example slots so the flow can be tried.
  function previewSlots() {
    var days = [];
    var d = new Date();
    for (var i = 1; days.length < 6 && i < 14; i++) {
      var day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (day.getDay() === 0) continue;
      var close = day.getDay() === 6 ? 14 : 18;
      var open = day.getDay() === 6 ? 10 : 9;
      var slots = [];
      for (var m = open * 60; m + 20 <= close * 60; m += 20) {
        var s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
        slots.push({ start: s.toISOString(), label: String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'), available: (m / 20) % 5 !== 2 });
      }
      days.push({ date: day.toISOString().slice(0, 10), label: day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), slots: slots });
    }
    return { days: days };
  }

  // ---- Slot picker (shared by booking form and manage page) ----
  function SlotPicker(root, onPick) {
    this.daysEl = $('#days', root);
    this.timesEl = $('#times', root);
    this.pickedEl = $('#slot-picked', root);
    this.input = $('#slot_start', root);
    this.onPick = onPick || function () {};
    this.days = [];
    this.loaded = false;
  }
  SlotPicker.prototype.load = function () {
    var self = this;
    self.timesEl.textContent = 'Loading available times...';
    var request = PREVIEW ? Promise.resolve({ ok: true, data: previewSlots() }) : api('/api/slots');
    return request.then(function (res) {
      if (!res.ok) throw new Error('slots');
      self.days = res.data.days || [];
      self.loaded = true;
      self.renderDays();
    }).catch(function () {
      if (!PREVIEW && window.location.protocol !== 'file:') {
        self.timesEl.textContent = 'We could not load call times. Please refresh the page or call us.';
      }
    });
  };
  SlotPicker.prototype.renderDays = function () {
    var self = this;
    self.daysEl.innerHTML = '';
    if (!self.days.length) {
      self.timesEl.textContent = 'No call times are free in the next two weeks. Please call us instead.';
      return;
    }
    self.days.forEach(function (day, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day';
      b.textContent = day.label;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { self.selectDay(i); });
      self.daysEl.appendChild(b);
    });
    var current = self.input.value;
    var idx = current ? self.days.findIndex(function (d) { return d.slots.some(function (s) { return s.start === current; }); }) : -1;
    self.selectDay(idx >= 0 ? idx : 0);
  };
  SlotPicker.prototype.selectDay = function (i) {
    var self = this;
    $$('.day', self.daysEl).forEach(function (b, j) { b.setAttribute('aria-pressed', String(i === j)); });
    self.timesEl.innerHTML = '';
    self.days[i].slots.forEach(function (slot) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'time';
      b.textContent = slot.label;
      b.disabled = !slot.available;
      b.setAttribute('aria-pressed', String(slot.start === self.input.value));
      if (!slot.available) b.setAttribute('aria-label', slot.label + ' (taken)');
      b.addEventListener('click', function () {
        self.input.value = slot.start;
        $$('.time', self.timesEl).forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        self.pickedEl.textContent = 'We will call you ' + fmtWhen(slot.start) + '.';
        self.onPick(slot.start);
      });
      self.timesEl.appendChild(b);
    });
  };

  // ---- Lead form ----
  function initLeadForm() {
    var form = $('#lead-form');
    if (!form) return;
    var steps = $$('.step', form);
    var bars = $$('.progress span', form);
    var current = 0;
    var picker = new SlotPicker(form, function () { setErr('slot_start', ''); });

    // data-default-<field>="value" preselects an answer (radio or select).
    Array.prototype.forEach.call(form.attributes, function (attr) {
      if (attr.name.indexOf('data-default-') !== 0 || !attr.value) return;
      var name = attr.name.slice(13).replace(/-/g, '_');
      var radio = form.querySelector('input[name="' + name + '"][value="' + attr.value + '"]');
      if (radio) radio.checked = true;
      else if (form.elements[name] && form.elements[name].tagName === 'SELECT') form.elements[name].value = attr.value;
    });

    function setErr(name, msg) {
      var el = form.querySelector('[data-err="' + name + '"]');
      if (el) el.textContent = msg || '';
      var field = el && el.closest('.field');
      if (field) field.classList.toggle('invalid', Boolean(msg));
    }

    function show(i) {
      steps.forEach(function (s, j) { s.hidden = j !== i; });
      bars.forEach(function (b, j) { b.classList.toggle('done', j <= i); });
      current = i;
      if ($('#days', steps[i]) && !picker.loaded) picker.load();
      var legend = $('legend', steps[i]);
      if (legend) { legend.setAttribute('tabindex', '-1'); legend.focus({ preventScroll: true }); }
      if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function val(name) {
      var el = form.elements[name];
      if (!el) return '';
      if (el instanceof RadioNodeList) return el.value;
      if (el.type === 'checkbox') return el.checked;
      return el.value.trim();
    }

    // Generic checks driven by the markup: [required] fields, [data-type="year"],
    // the slot picker step and the contact step.
    function validateStep(i) {
      var ok = true;
      var step = steps[i];
      function fail(name, msg) { setErr(name, msg); ok = false; }
      var seen = {};
      $$('[name]', step).forEach(function (el) {
        var name = el.name;
        if (seen[name] || el.type === 'hidden' || el.closest('.hp')) return;
        seen[name] = true;
        var v = val(name);
        if (el.hasAttribute('required') || el.closest('[data-required]')) {
          if (!v) { fail(name, el.type === 'radio' || el.tagName === 'SELECT' ? 'Please choose one.' : 'Please fill this in.'); return; }
        }
        if (el.getAttribute('data-type') === 'year' && v) {
          var max = new Date().getFullYear() + 1;
          if (!(/^\d{4}$/.test(v) && +v >= 2000 && +v <= max)) { fail(name, 'Enter a year like 2022.'); return; }
        }
        if (name === 'phone') {
          if (!/^(\+44|0044|0)[1-37]\d{8,9}$/.test(v.replace(/[\s\-().]/g, ''))) { fail('phone', 'Please enter a UK number, e.g. 07700 900123.'); return; }
        }
        if (name === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { fail('email', 'That email address does not look right.'); return; }
        if (name === 'consent_contact' && !v) { fail('consent_contact', 'Please tick this so we can call you.'); return; }
        setErr(name, '');
      });
      if ($('#days', step) && !val('slot_start')) fail('slot_start', 'Please pick a call time.');
      return ok;
    }

    $$('[data-next]', form).forEach(function (b) {
      b.addEventListener('click', function () { if (validateStep(current)) show(current + 1); });
    });
    $$('[data-back]', form).forEach(function (b) {
      b.addEventListener('click', function () { show(current - 1); });
    });
    $$('input[name="interest"]', form).forEach(function (r) {
      r.addEventListener('change', function () { setErr('interest', ''); });
    });

    function utm() {
      var out = {};
      var params = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function (k) {
        if (params.get(k)) out[k] = params.get(k);
      });
      if (document.referrer && document.referrer.indexOf(window.location.host) === -1) out.referrer = document.referrer;
      return out;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep(steps.length - 1)) return;
      var btn = $('#submit-btn');
      var errBox = $('#form-error');
      errBox.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Booking...';

      var body = { source_page: form.getAttribute('data-source-page'), utm: utm() };
      $$('[name]', form).forEach(function (el) {
        if (!(el.name in body)) body[el.name] = val(el.name);
      });

      if (PREVIEW) {
        btn.disabled = false;
        btn.textContent = 'Book my call';
        errBox.textContent = 'Preview only: on the live site this books the call for ' + fmtWhen(body.slot_start) + ' and alerts the sales team.';
        return;
      }

      api('/api/leads', { method: 'POST', body: body }).then(function (res) {
        if (res.ok) {
          window.location.href = '/thank-you?token=' + encodeURIComponent(res.data.token);
          return;
        }
        btn.disabled = false;
        btn.textContent = 'Book my call';
        var errors = (res.data && res.data.errors) || {};
        Object.keys(errors).forEach(function (k) { setErr(k, errors[k]); });
        // Jump back to the first step that holds a field with an error.
        var target = steps.length - 1;
        steps.forEach(function (st, idx) {
          Object.keys(errors).forEach(function (k) {
            var inStep = k === 'slot_start' ? $('#days', st) : st.querySelector('[name="' + k + '"]');
            if (inStep && idx < target) target = idx;
          });
        });
        if (errors.slot_start) { picker.input.value = ''; picker.load(); }
        if (target !== steps.length - 1) show(target);
        errBox.textContent = res.data.error || (Object.keys(errors).length ? 'Please check the highlighted details.' : 'Something went wrong. Please try again or call us.');
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = 'Book my call';
        errBox.textContent = 'We could not reach our booking system. Please check your connection and try again.';
      });
    });

    show(0);
    // Don't steal focus on first load.
    if (document.activeElement && document.activeElement.tagName === 'LEGEND') document.activeElement.blur();
  }

  // ---- Plate age checker ----
  function initChecker() {
    var input = $('#checker-year');
    if (!input) return;
    var out = $('#checker-out');
    var bookLink = $('#checker-book');
    function run() {
      var y = parseInt(input.value, 10);
      var now = new Date().getFullYear();
      out.classList.remove('urgent');
      if (!(y >= 1990 && y <= now)) {
        out.textContent = 'Enter a four-digit year, e.g. 2013.';
        bookLink.hidden = true;
        return;
      }
      var end = y + 15;
      var left = end - now;
      if (left <= 0) {
        out.innerHTML = 'A cab first registered in ' + y + ' has reached TfL\'s <b>15-year limit</b> and can\'t be relicensed in London. We can still make you an offer.';
        out.classList.add('urgent');
      } else if (left <= 2) {
        out.innerHTML = 'Its London licence ends around <b>' + end + '</b>, so you have about <b>' + left + ' year' + (left === 1 ? '' : 's') + '</b> left. Start planning your next cab now.';
        out.classList.add('urgent');
      } else {
        out.innerHTML = 'Its London licence ends around <b>' + end + '</b>, about <b>' + left + ' years</b> from now.';
      }
      bookLink.hidden = false;
      var plate = document.getElementById('plate_year');
      if (plate && !plate.value) plate.value = String(y);
    }
    $('#checker-go').addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  }

  // ---- Thank-you and manage pages ----
  function initConfirm() {
    var root = $('#confirm');
    if (!root) return;
    var mode = root.getAttribute('data-mode');
    var token = new URLSearchParams(window.location.search).get('token');
    var whenEl = $('#ticket-when');
    var phoneEl = $('#ticket-phone');

    if (!token || token === 'thanks') {
      whenEl.textContent = token === 'thanks' ? 'Thanks, we have your details.' : 'We could not find that booking.';
      if ($('#ics-link')) $('#ics-link').hidden = true;
      if ($('#manage-link')) $('#manage-link').hidden = true;
      return;
    }

    var base = '/api/bookings/' + encodeURIComponent(token);
    if ($('#ics-link')) $('#ics-link').href = base + '/ics';
    if ($('#manage-link')) $('#manage-link').href = '/booking?token=' + encodeURIComponent(token);

    function render(b) {
      whenEl.textContent = b.status === 'cancelled' ? 'Cancelled' : b.when;
      phoneEl.textContent = b.status === 'cancelled' ? 'This call has been cancelled.' : 'We will call your number ending ' + b.phone_last4 + '.';
      if (mode === 'manage') {
        $('#manage-actions').hidden = false;
        $('#cancel-btn').hidden = b.status === 'cancelled';
        $('#ics-link').hidden = b.status === 'cancelled';
        $('#show-reschedule').textContent = b.status === 'cancelled' ? 'Book a new time' : 'Change time';
        $('#ticket-status').textContent = b.status === 'cancelled' ? 'Cancelled call' : 'Your call';
      }
    }

    api(base).then(function (res) {
      if (!res.ok) { whenEl.textContent = 'We could not find that booking.'; return; }
      render(res.data.booking);
    });

    if (mode !== 'manage') return;

    var picker = new SlotPicker(root);
    $('#show-reschedule').addEventListener('click', function () {
      $('#reschedule').hidden = false;
      $('#cancel-confirm').hidden = true;
      if (!picker.loaded) picker.load();
    });
    $('#cancel-btn').addEventListener('click', function () {
      $('#cancel-confirm').hidden = false;
      $('#reschedule').hidden = true;
    });
    $('#cancel-no').addEventListener('click', function () { $('#cancel-confirm').hidden = true; });
    $('#cancel-yes').addEventListener('click', function () {
      api(base + '/cancel', { method: 'POST', body: {} }).then(function (res) {
        $('#cancel-confirm').hidden = true;
        if (res.ok) render(res.data.booking);
      });
    });
    $('#reschedule-save').addEventListener('click', function () {
      var slot = $('#slot_start').value;
      var err = $('#form-error');
      if (!slot) { err.textContent = 'Please pick a new time.'; return; }
      api(base + '/reschedule', { method: 'POST', body: { slot_start: slot } }).then(function (res) {
        if (res.ok) {
          err.textContent = '';
          $('#reschedule').hidden = true;
          render(res.data.booking);
        } else {
          err.textContent = (res.data.errors && res.data.errors.slot_start) || 'That did not work. Please try again.';
          picker.input.value = '';
          picker.load();
        }
      });
    });
  }

  initLeadForm();
  initChecker();
  initConfirm();
})();
