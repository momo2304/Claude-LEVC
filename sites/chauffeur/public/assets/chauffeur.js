(function () {
  'use strict';

  // Platform eligibility checker. Rules summarise each platform's published
  // requirements as of October 2026 (see docs/chauffeur/RESEARCH.md).
  var box = document.getElementById('ck-results');
  if (!box) return;

  var carSel = document.getElementById('ck-car');
  var yearSel = document.getElementById('ck-year');
  var citySel = document.getElementById('ck-city');
  var now = new Date().getFullYear();

  for (var y = now; y >= now - 10; y--) {
    var o = document.createElement('option');
    o.value = String(y);
    o.textContent = String(y);
    yearSel.appendChild(o);
  }
  yearSel.value = String(now - 1);

  var ZEC = { s_phev: 1, eqs: 1, eqe: 1, e_phev: 1, eqv: 1, i7: 1, b7_phev: 1 };
  var VAN = { v_diesel: 1, eqv: 1 };
  var S = { s_phev: 1, s_diesel: 1 };
  var E = { e_phev: 1, e_diesel: 1 };

  function until(year, limit) {
    return 'about ' + (year + limit);
  }

  function check(car, year, city) {
    var age = now - year;
    var big3 = city === 'london' || city === 'mcr_bham' || city === 'council';
    var out = [];

    var council = city === 'council';
    if (city === 'london') {
      if (ZEC[car]) out.push(['ok', 'TfL first licence', 'Zero emission capable, so it can be licensed as a London PHV for the first time.']);
      else out.push(['no', 'TfL first licence', 'Not zero emission capable. It can only be re-licensed if it already holds a London PHV licence (up to 10 years old).']);
    }
    if (council) {
      out.push(age <= 6
        ? ['ok', 'Hertsmere licence', 'Up to 6 years old at first licence, Euro 6, no zero emission rule. Plate exemption possible for executive contract work.']
        : ['no', 'Hertsmere licence', 'Hertsmere licenses cars up to 6 years old at first licence.']);
      out.push(age <= 5
        ? ['ok', 'Windsor & Maidenhead licence', 'Up to 5 years old at first licence; plate exemption with written business contracts.']
        : ['maybe', 'Windsor & Maidenhead licence', 'Over 5 years at first licence; RBWM can make exceptions for prestige cars in excellent condition.']);
    }

    // Uber
    if (council) {
      out.push(['maybe', 'Uber', 'Uber lets you work only in the region where you are licensed (long trips such as airport runs allowed). London Uber work needs a TfL licence.']);
    } else if (VAN[car]) {
      var xxl = city === 'london' ? 6 : 10;
      out.push(age <= xxl
        ? ['ok', 'Uber Exec XXL', 'Up to ' + xxl + ' years old here, if licensed for 7 or more passengers. Eligible until ' + until(year, xxl) + '.']
        : ['no', 'Uber Exec XXL', 'Over the ' + xxl + '-year limit here.']);
      out.push(['no', 'Uber Exec / Lux', 'Exec and Lux are saloon-only tiers.']);
    } else {
      var lim = big3 ? 5 : 6;
      out.push(age <= lim
        ? ['ok', 'Uber Exec', 'Up to ' + lim + ' model years old here' + (big3 ? ', in black, grey, blue, dark blue or dark grey' : '') + '. Eligible until ' + until(year, lim) + '.']
        : ['no', 'Uber Exec', 'Over the ' + lim + '-year limit for cars added under the 2026 rules.']);
      var luxModel = S[car] || car === 'eqs' || car === 'i7' || car === 'b7_phev';
      if (city !== 'london') out.push(['no', 'Uber Lux', 'Lux runs in London only.']);
      else if (!luxModel) out.push(['no', 'Uber Lux', 'Not on the Lux model list. Choose an S-Class, EQS, 7 Series or i7.']);
      else out.push(age <= 5
        ? ['maybe', 'Uber Lux', 'On the Lux list and within 5 years. Lux needs 1,000+ trips and a 4.92+ rating, and onboarding has been invite-only.']
        : ['no', 'Uber Lux', 'Over the 5-year limit.']);
    }

    // Wheely (London)
    var wheelyNote = city === 'london' ? '' : council ? ' Wheely accepts Hertsmere, Windsor & Maidenhead and Castle Point licences (RBWM needs a plate exemption).' : ' Wheely works mainly in London.';
    if (S[car]) {
      out.push(year >= 2024
        ? ['ok', 'Wheely First', 'Registered 2024 or later. Must be long wheelbase with panoramic roof, rear blinds, reclining heated rear seats and rear climate control.' + wheelyNote]
        : ['no', 'Wheely First', 'Wheely First needs an S-Class first registered in 2024 or later.']);
    } else if (VAN[car]) {
      out.push(age <= 3
        ? ['ok', 'Wheely XL', 'Long or extra-long wheelbase, black, silver or grey, child seat required. Eligible until ' + until(year, 3) + '.' + wheelyNote]
        : ['no', 'Wheely XL', 'Wheely XL takes vans 3 years old or newer.']);
    } else {
      var generationOk = E[car] ? year >= 2023 : (car === 'i7' || car === 'b7_phev') ? year >= 2022 : true;
      if (!generationOk) out.push(['no', 'Wheely Business', E[car] ? 'Only the W214 E-Class (2023 on) is accepted.' : 'Only the G70 7 Series / i7 (2022 on) is accepted.']);
      else out.push(age <= 3
        ? ['ok', 'Wheely Business', '3 years old or newer. ' + (car === 'eqe' || car === 'eqs' ? 'Black or graphite grey only. ' : '') + (car === 'i7' || car === 'b7_phev' ? 'Tinted windows mandatory. ' : '') + 'Eligible until ' + until(year, 3) + '.' + wheelyNote]
        : ['no', 'Wheely Business', 'Wheely Business takes cars 3 years old or newer.']);
    }

    // Blacklane (vehicle years set per city in the partner portal)
    if (E[car]) out.push(['maybe', 'Blacklane Business', 'E-Class is listed. Accepted years are set per city in the partner portal.']);
    else if (S[car] || car === 'b7_phev') out.push(['maybe', 'Blacklane First', 'Listed for First. Accepted years are set per city in the partner portal.']);
    else if (VAN[car]) out.push(['maybe', 'Blacklane Business Van', 'V-Class is listed. Accepted years are set per city in the partner portal.']);
    else out.push(['maybe', 'Blacklane', 'Not named on the public list ("or similar"). Check the partner portal.']);

    // Bolt
    out.push(year >= 2018
      ? ['ok', 'Bolt Premium', 'On Bolt’s Premium model list (2018 or newer), in selected areas.']
      : ['no', 'Bolt Premium', 'Bolt Premium takes 2018 or newer.']);

    return out;
  }

  var ICON = { ok: 'YES', no: 'NO', maybe: 'CHECK' };

  function render() {
    var rows = check(carSel.value, parseInt(yearSel.value, 10), citySel.value);
    box.innerHTML = '';
    rows.forEach(function (r) {
      var div = document.createElement('div');
      div.className = 'result ' + r[0];
      var i = document.createElement('i');
      i.textContent = ICON[r[0]];
      var p = document.createElement('span');
      var b = document.createElement('b');
      b.textContent = r[1] + ': ';
      p.appendChild(b);
      p.appendChild(document.createTextNode(r[2]));
      div.appendChild(i);
      div.appendChild(p);
      box.appendChild(div);
    });
  }

  [carSel, yearSel, citySel].forEach(function (el) { el.addEventListener('change', render); });
  render();
})();

(function () {
  'use strict';

  // Audience switcher tabs.
  var root = document.querySelector('[data-segments]');
  if (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.tabIndex = i === 0 ? 0 : -1;
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
  }

  // Buttons with data-preset="field=value&field=value" pre-fill the booking form.
  var form = document.getElementById('lead-form');
  if (!form) return;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-preset]');
    if (!a) return;
    new URLSearchParams(a.getAttribute('data-preset')).forEach(function (value, name) {
      var radio = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (radio) radio.checked = true;
      else if (form.elements[name] && form.elements[name].tagName === 'SELECT') form.elements[name].value = value;
    });
  });
})();
