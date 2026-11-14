const $ = (id) => document.getElementById(id);
const MAX_GROUPS = 3;
const whole = (n) => `$${Math.round(n).toLocaleString()}`;

async function render() {
  let s = await chrome.storage.local.get(['categories', 'enabled', 'blockedGroups', 'statsMonth', 'blockedThisMonth', 'shownAnyway', 'days']);
  if (!s.categories) s.categories = await chrome.runtime.sendMessage({ type: 'refresh' });
  if (!s.categories) return;
  const data = s.categories;
  const groups = data.groups || data.categories.map((c) => ({ ...c, members: [c.id] }));
  // Nothing chosen yet, or none of the saved groups exist for this person's spending = top spending group.
  const saved = (s.blockedGroups ?? []).filter((g) => groups.some((x) => x.id === g));
  const selected = new Set(s.blockedGroups && (saved.length || !s.blockedGroups.length) ? saved : [data.top]);
  const thisMonth = s.statsMonth === new Date().toISOString().slice(0, 7);
  const blocked = thisMonth ? s.blockedThisMonth || 0 : 0;
  const shown = thisMonth ? s.shownAnyway || 0 : 0;

  const on = s.enabled !== false;
  $('enabled').checked = on;
  $('state').textContent = on ? 'On' : 'Off';
  document.body.classList.toggle('is-off', !on);

  // The extension falls back to built-in numbers when the backend is down; say so instead of passing them off as yours.
  $('notice').hidden = data.source !== 'mock';
  $('notice').textContent = 'This is sample spending. Start the Impulse backend to see yours.';
  $('source').textContent = data.source === 'mock' ? 'Sample data' : 'Capital One sandbox';

  const empty = (text) => { const li = document.createElement('li'); li.className = 'empty'; li.textContent = text; return li; };
  if (!groups.length) {
    delete $('groups').dataset.ids;
    $('lead').textContent = 'Nothing to block';
    $('lead-sub').textContent = 'No fun spending in the last 30 days';
    $('groups').replaceChildren(empty('Nothing yet'));
    $('bars').replaceChildren(empty('Nothing yet'));
    $('count').textContent = '';
    $('limit').textContent = '';
    $('blocked').textContent = blocked;
    $('shown').textContent = shown;
    $('saved').textContent = '-';
    return;
  }

  // Lead fact: what is blocked and what it cost, in one line.
  const picked = groups.filter((g) => selected.has(g.id));
  const total = picked.reduce((n, g) => n + g.total, 0);
  const count = picked.reduce((n, g) => n + g.count, 0);
  if (!picked.length) {
    $('lead').textContent = 'Nothing blocked';
    $('lead-sub').textContent = 'Check a group below to start'
  } else if (picked.length === 1) {
    $('lead').textContent = `${whole(total)} on ${picked[0].label.toLowerCase()}`;
    $('lead-sub').textContent = `${count} purchases in the last 30 days`;
  } else {
    $('lead').textContent = `${whole(total)} on ${picked.length} groups`;
    $('lead-sub').textContent = `${picked.map((g) => g.label).join(', ')} in the last 30 days`;
  }
  if (!on) $('lead-sub').textContent = 'Paused, so nothing is blurred right now';

  // Block list: rebuilt only when the groups change, so a click doesn't lose keyboard focus.
  const list = $('groups');
  const ids = groups.map((g) => g.id).join();
  if (list.dataset.ids !== ids) {
    list.dataset.ids = ids;
    list.replaceChildren(...groups.map((g) => {
      const li = document.createElement('li');
      li.innerHTML = '<label><input type="checkbox"><span class="name"></span><span class="amt"></span></label>';
      li.querySelector('input').value = g.id;
      li.querySelector('.name').textContent = g.label;
      li.querySelector('.amt').textContent = whole(g.total);
      return li;
    }));
  }
  // At most 3 groups: once 3 are checked, the rest are disabled until one is unchecked.
  for (const box of list.querySelectorAll('input')) {
    box.checked = selected.has(box.value);
    box.disabled = !box.checked && selected.size >= MAX_GROUPS;
  }
  $('count').textContent = `${selected.size} of ${MAX_GROUPS}`;
  $('limit').textContent = selected.size >= MAX_GROUPS ? 'Uncheck one to pick another' : '';

  const isBlocked = (c) => selected.has(c.id) || selected.has(c.parent);
  const max = Math.max(...data.categories.map((c) => c.total), 1);
  $('bars').replaceChildren(...data.categories.map((c) => {
    const li = document.createElement('li');
    if (isBlocked(c)) li.className = 'is-blocked';
    li.innerHTML = '<span class="name"></span><span class="amt"></span><span class="track"><span class="fill"></span></span>';
    li.querySelector('.name').textContent = c.label;
    li.querySelector('.amt').textContent = whole(c.total);
    li.querySelector('.fill').style.width = `${(c.total / max) * 100}%`;
    li.setAttribute('aria-label', `${c.label}: ${whole(c.total)}${isBlocked(c) ? ', blocked' : ''}`);
    return li;
  }));

  // Estimate uses the average order across the checked groups.
  const avg = count ? total / count : 0;
  $('blocked').textContent = blocked;
  $('shown').textContent = shown;
  // One avoided order per day with a block and no "Show anyway", never more than you actually spent in these groups.
  const resistedDays = thisMonth ? Object.values(s.days || {}).filter((d) => d.b > 0 && d.s === 0).length : 0;
  $('saved').textContent = `~${whole(Math.min(resistedDays * avg, total))}`;
}

$('groups').addEventListener('change', () => {
  const blockedGroups = [...$('groups').querySelectorAll('input:checked')].map((b) => b.value).slice(0, MAX_GROUPS);
  chrome.storage.local.set({ blockedGroups });
});

$('enabled').addEventListener('change', (e) => chrome.storage.local.set({ enabled: e.target.checked }));
chrome.storage.onChanged.addListener(render);
render();
chrome.runtime.sendMessage({ type: 'refresh' }).catch(() => {}); // pick up the backend if it started after the extension; render re-runs on storage change
