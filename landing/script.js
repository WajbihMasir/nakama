/* Nakama landing — small, dependency-free enhancements.
   1. Hero console: a scripted agent run per channel, ending in a human decision.
   2. Deploy tabs (ARIA tabs pattern).
   3. Copy-to-clipboard for code blocks. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 1. Hero console ---------------- */
  var SCENARIOS = {
    telegram: {
      title: "ops-agent",
      items: [
        { t: "human", who: "Rina · Telegram", text: "Summarize yesterday's support inbox and draft replies for the refund requests." },
        { t: "step", tool: "memory", text: "read MEMORY.md: refund policy, tone" },
        { t: "step", tool: "composio", text: "gmail.search: 24 threads since yesterday" },
        { t: "step", tool: "skill", text: "support-digest" },
        { t: "agent", who: "ops-agent", text: "24 threads, 19 already answered. 3 refund requests need a decision. I drafted replies in your usual tone." },
        { t: "handoff", label: "Your call", text: "Send the 3 refund replies?", yes: "Approve & send", no: "I'll edit first",
          yesResult: "Sent. The agent logged the outcome for next time.", noResult: "Drafts saved to Files for you to edit." }
      ]
    },
    slack: {
      title: "sales-agent",
      items: [
        { t: "human", who: "Dimas · Slack", text: "Update the CRM after today's calls and tell me who needs a follow-up." },
        { t: "step", tool: "plugin", text: "google-meet: 4 call notes" },
        { t: "step", tool: "composio", text: "hubspot.update_contact × 4" },
        { t: "step", tool: "memory", text: "write: Kawa Studio asked for pricing" },
        { t: "agent", who: "sales-agent", text: "4 records updated. Kawa Studio wants pricing before Friday. Notes and a draft email are ready." },
        { t: "handoff", label: "Your call", text: "The pricing conversation with Kawa Studio: yours?", yes: "I'll take it", no: "Reassign",
          yesResult: "Assigned to you, with the call notes attached.", noResult: "Sent to #sales for someone to pick up." }
      ]
    },
    whatsapp: {
      title: "client-agent",
      items: [
        { t: "human", who: "Sari (client) · WhatsApp", text: "Can we move Thursday's shoot to Friday morning?" },
        { t: "step", tool: "memory", text: "org: Sari Florist · crew, location" },
        { t: "step", tool: "composio", text: "googlecalendar.find_free_slots" },
        { t: "step", tool: "composio", text: "googlecalendar.hold Fri 09:00" },
        { t: "agent", who: "client-agent", text: "Friday 09:00 works for the crew. I've held the slot and told Sari we'll confirm within the hour." },
        { t: "handoff", label: "Your call", text: "Confirm Friday 09:00 with the client?", yes: "Confirm", no: "I'll call her",
          yesResult: "Confirmed on WhatsApp. Thursday is released.", noResult: "Slot held. A reminder is on your task list." }
      ]
    },
    discord: {
      title: "standup-agent",
      items: [
        { t: "system", text: "Automation · Daily standup digest · 09:00" },
        { t: "step", tool: "skill", text: "standup-digest" },
        { t: "step", tool: "read", text: "#standup: 12 updates from yesterday" },
        { t: "agent", who: "standup-agent", text: "9 tasks closed. 2 blocked: billing export and the iOS build. Posted the digest to #team." },
        { t: "handoff", label: "Your call", text: "2 blockers need an owner.", yes: "Assign me", no: "Raise at standup",
          yesResult: "Both blockers are on your list.", noResult: "Added to today's standup agenda." }
      ]
    }
  };
  var ORDER = ["telegram", "slack", "whatsapp", "discord"];

  var consoleEl = document.getElementById("console");
  var feed = document.getElementById("console-feed");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".channel-tab"));
  var replayBtn = document.getElementById("replay");
  var titleEl = document.querySelector("#console-title .mono");

  if (consoleEl && feed && tabs.length) {
    var timers = [];
    var current = "telegram";
    var userTouched = false;
    var inView = true;
    var autoLoops = 0;

    var clearTimers = function () { timers.forEach(clearTimeout); timers = []; };
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };

    var el = function (tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    var scrollDown = function () { feed.scrollTop = feed.scrollHeight; };

    var renderItem = function (item, animate) {
      var node;
      if (item.t === "human" || item.t === "agent") {
        node = el("div", "msg " + (item.t === "human" ? "msg-human" : "msg-agent"));
        node.appendChild(el("span", "who", item.who));
        node.appendChild(el("p", null, item.text));
      } else if (item.t === "system") {
        node = el("p", "small mono", "⏱ " + item.text);
      } else if (item.t === "step") {
        var list = feed.querySelector(".steps:last-child");
        if (!list) { list = el("ol", "steps"); feed.appendChild(list); }
        var prev = list.querySelector(".is-running");
        if (prev) prev.classList.remove("is-running");
        var li = el("li", animate ? "reveal is-running" : null);
        li.appendChild(el("span", "mono", item.tool));
        li.appendChild(document.createTextNode(item.text));
        list.appendChild(li);
        if (animate) later(function () { li.classList.remove("is-running"); }, 650);
        return;
      } else if (item.t === "handoff") {
        node = el("div", "handoff");
        node.appendChild(el("p", "handoff-label", item.label));
        node.appendChild(el("p", null, item.text));
        var actions = el("div", "handoff-actions");
        var yes = el("button", "primary", item.yes); yes.type = "button";
        var no = el("button", null, item.no); no.type = "button";
        var decide = function (result) {
          userTouched = true;
          clearTimers();
          actions.remove();
          node.classList.add("is-done");
          node.querySelector(".handoff-label").textContent = "Decided by you";
          node.appendChild(el("p", "handoff-result", result));
          scrollDown();
        };
        yes.addEventListener("click", function () { decide(item.yesResult); });
        no.addEventListener("click", function () { decide(item.noResult); });
        actions.appendChild(yes); actions.appendChild(no);
        node.appendChild(actions);
      }
      if (animate) node.classList.add("reveal");
      feed.appendChild(node);
    };

    var play = function (key, opts) {
      opts = opts || {};
      clearTimers();
      current = key;
      var sc = SCENARIOS[key];
      tabs.forEach(function (t) {
        var on = t.dataset.channel === key;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        if (on) feed.setAttribute("aria-labelledby", t.id);
      });
      if (titleEl) titleEl.textContent = sc.title;
      feed.innerHTML = "";

      if (reduceMotion || opts.instant) {
        sc.items.forEach(function (it) { renderItem(it, false); });
        scrollDown();
        return;
      }
      var t = 250;
      sc.items.forEach(function (it) {
        var d = it.t === "step" ? 750 : it.t === "handoff" ? 900 : 1100;
        later(function () { renderItem(it, true); scrollDown(); }, t);
        t += d;
      });
      // Gentle auto-advance until the visitor interacts (one loop only).
      later(function () {
        if (userTouched || !inView) return;
        var i = ORDER.indexOf(current);
        if (i === ORDER.length - 1) { autoLoops++; if (autoLoops >= 1) return; }
        play(ORDER[(i + 1) % ORDER.length]);
      }, t + 4200);
    };

    var markTouched = function () {
      userTouched = true;
      feed.setAttribute("aria-live", "polite");
    };

    tabs.forEach(function (tab, idx) {
      tab.addEventListener("click", function () { markTouched(); play(tab.dataset.channel); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
        if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          tabs[next].focus();
          markTouched();
          play(tabs[next].dataset.channel);
        }
      });
    });
    if (replayBtn) replayBtn.addEventListener("click", function () { markTouched(); play(current); });

    // Autoplay announcements would be noisy for screen readers.
    feed.setAttribute("aria-live", "off");

    if ("IntersectionObserver" in window) {
      var started = false;
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !started) { started = true; play("telegram"); }
      }, { threshold: 0.25 }).observe(consoleEl);
    } else {
      play("telegram");
    }
  }

  /* ---------------- 2. Deploy tabs ---------------- */
  var dtabs = Array.prototype.slice.call(document.querySelectorAll(".deploy-tabs [role='tab']"));
  var select = function (tab, focus) {
    dtabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  };
  dtabs.forEach(function (tab, idx) {
    tab.addEventListener("click", function () { select(tab, false); });
    tab.addEventListener("keydown", function (e) {
      var n = null;
      if (e.key === "ArrowRight") n = (idx + 1) % dtabs.length;
      if (e.key === "ArrowLeft") n = (idx - 1 + dtabs.length) % dtabs.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = dtabs.length - 1;
      if (n !== null) { e.preventDefault(); select(dtabs[n], true); }
    });
  });

  /* ---------------- 3. Copy buttons ---------------- */
  Array.prototype.forEach.call(document.querySelectorAll(".copy"), function (btn) {
    btn.addEventListener("click", function () {
      var src = document.getElementById(btn.dataset.copy);
      if (!src) return;
      var text = src.innerText.split("\n").filter(function (l) { return l.trim().indexOf("#") !== 0; }).join("\n");
      var done = function (ok) {
        btn.textContent = ok ? "Copied" : "Select & copy";
        setTimeout(function () { btn.textContent = "Copy"; }, 1800);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        try {
          var ta = document.createElement("textarea");
          ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
          document.body.appendChild(ta); ta.select();
          done(document.execCommand("copy"));
          ta.remove();
        } catch (e) { done(false); }
      }
    });
  });
})();
