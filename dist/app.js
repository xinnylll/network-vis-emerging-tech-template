const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const colors = ['#60a5fa', '#2dd4bf', '#fbbf24', '#f472b6'];

const canvas = $('#network-canvas');
const ctx = canvas.getContext('2d');
let graph;
let region = 'brazil';
let selected = null;
let hover = null;
let activeQuartiles = new Set([0, 1, 2, 3]);
let transform = { scale: 1, x: 0, y: 0 };
let pointer = null;
let screenNodes = [];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const format = value => Number(value).toLocaleString();

function fitPoint(node) {
  const width = canvas.width / devicePixelRatio;
  const height = canvas.height / devicePixelRatio;
  const padding = Math.min(width, height) * 0.08;
  const baseX = padding + node.x * (width - padding * 2);
  const baseY = padding + node.y * (height - padding * 2);
  return [width / 2 + (baseX - width / 2) * transform.scale + transform.x, height / 2 + (baseY - height / 2) * transform.scale + transform.y];
}

function nodeRadius(node) { return Math.min(12, 2.8 + Math.sqrt(node.degree) * 0.55); }
function isVisible(node) { return activeQuartiles.has(node.quartile); }

function neighborSet(index) {
  const set = new Set();
  if (index === null) return set;
  for (const [source, target] of graph.edges) {
    if (source === index) set.add(target);
    if (target === index) set.add(source);
  }
  return set;
}

function draw() {
  if (!graph || !canvas.width) return;
  const ratio = devicePixelRatio;
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const positions = graph.nodes.map(fitPoint);
  const neighbors = neighborSet(selected);
  ctx.lineCap = 'round';

  for (const [source, target] of graph.edges) {
    const aNode = graph.nodes[source], bNode = graph.nodes[target];
    if (!isVisible(aNode) || !isVisible(bNode)) continue;
    const incident = selected !== null && (source === selected || target === selected);
    ctx.strokeStyle = incident ? 'rgba(125, 211, 252, .92)' : selected !== null ? 'rgba(148, 163, 184, .035)' : 'rgba(148, 163, 184, .13)';
    ctx.lineWidth = incident ? 1.6 : 0.55;
    ctx.beginPath(); ctx.moveTo(...positions[source]); ctx.lineTo(...positions[target]); ctx.stroke();
  }

  screenNodes = [];
  graph.nodes.forEach((node, index) => {
    if (!isVisible(node)) return;
    const [x, y] = positions[index];
    const radius = nodeRadius(node);
    const related = selected === null || index === selected || neighbors.has(index);
    ctx.globalAlpha = related ? 0.96 : 0.13;
    ctx.fillStyle = colors[node.quartile];
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    if (index === selected || index === hover) {
      ctx.strokeStyle = index === selected ? '#ffffff' : '#cbd5e1';
      ctx.lineWidth = index === selected ? 3 : 2;
      ctx.stroke();
    }
    screenNodes.push({ index, x, y, radius: Math.max(radius, 7) });
  });
  ctx.globalAlpha = 1;

  if ($('#show-labels').checked) {
    const hubs = [...graph.nodes].sort((a, b) => b.degree - a.degree).slice(0, region === 'usa' ? 10 : 8);
    const labels = new Set(hubs.map(node => node.id));
    if (selected !== null) labels.add(graph.nodes[selected].id);
    graph.nodes.forEach((node, index) => {
      if (!labels.has(node.id) || !isVisible(node)) return;
      const [x, y] = positions[index];
      ctx.font = '600 11px "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'left';
      ctx.fillText(node.id, x + nodeRadius(node) + 4, y + 4);
    });
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  canvas.width = Math.round(rect.width * devicePixelRatio);
  canvas.height = Math.round(rect.height * devicePixelRatio);
  draw();
}

function updateNodeDetail() {
  if (selected === null) return;
  const node = graph.nodes[selected];
  const neighbors = [...neighborSet(selected)];
  const byQuartile = [0, 0, 0, 0];
  neighbors.forEach(index => byQuartile[graph.nodes[index].quartile]++);
  $('#node-detail').innerHTML = `<div class="selected-node"><div class="node-orb q${node.quartile}">${esc(node.id)}</div><div><span class="detail-label">SELECTED AIRPORT NODE</span><h3>ID ${esc(node.id)}</h3></div></div><div class="node-stats"><div><span>Activity quartile</span><strong>Q${node.quartile + 1} <small>label ${node.quartile}</small></strong></div><div><span>Direct routes / degree</span><strong>${format(node.degree)}</strong></div></div><div class="neighbor-mix"><span class="detail-label">NEIGHBORS BY QUARTILE</span>${byQuartile.map((count, quartile) => `<div><i class="q${quartile}"></i><span>Q${quartile + 1}</span><strong>${format(count)}</strong></div>`).join('')}</div>`;
  $('#node-search').value = node.id;
}

function updateSummary() {
  const n = graph.meta.node_count, m = graph.meta.edge_count;
  $('#region-name').textContent = graph.meta.display_name;
  $('#node-count').textContent = format(n); $('#edge-count').textContent = format(m);
  $('#density').textContent = (2 * m / (n * (n - 1)) * 100).toFixed(2) + '%';
  $('#mean-degree').textContent = (2 * m / n).toFixed(1);
  $('#network-status').textContent = `${format(n)} airports · ${format(m)} commercial routes`;

  const maxMean = Math.max(...graph.quartiles.map(item => item.mean_degree));
  $('#quartile-profile').innerHTML = graph.quartiles.map(item => `<div class="profile-row"><div class="profile-label"><i class="q${item.label}"></i><strong>Q${item.label + 1}</strong><span>label ${item.label}</span></div><div class="profile-track"><span class="q${item.label}" style="width:${item.mean_degree / maxMean * 100}%"></span></div><div class="profile-value"><strong>${item.mean_degree}</strong><span>mean degree · ${item.count} nodes</span></div></div>`).join('');

  const top = [...graph.nodes].sort((a, b) => b.degree - a.degree).slice(0, 12);
  $('#hub-table').innerHTML = top.map(node => `<tr><td><button class="table-node">${esc(node.id)}</button></td><td><span class="table-quartile q${node.quartile}">Q${node.quartile + 1}</span> <small>(label ${node.quartile})</small></td><td>${format(node.degree)}</td><td>${(node.degree / graph.meta.edge_count * 100).toFixed(2)}%</td></tr>`).join('');
  $$('.table-node').forEach(button => button.addEventListener('click', () => selectById(button.textContent)));
  $('#downloads').innerHTML = `Download ${esc(graph.meta.display_name)} data: <a href="data/airports/${region}-nodes.csv">nodes.csv</a> · <a href="data/airports/${region}-edges.csv">edges.csv</a> · <a href="data/airports/${region}.json">visualization JSON</a>`;
  $('#node-options').innerHTML = graph.nodes.map(node => `<option value="${esc(node.id)}"></option>`).join('');
}

function selectById(id) {
  const index = graph.nodes.findIndex(node => node.id === String(id).trim());
  if (index < 0) { $('#search-message').textContent = `Node “${id}” is not in the ${graph.meta.display_name} network.`; return; }
  selected = index; activeQuartiles.add(graph.nodes[index].quartile); updateFilterButtons();
  $('#search-message').textContent = ''; updateNodeDetail(); draw(); canvas.focus();
}

function updateFilterButtons() {
  $$('.quartile-filter').forEach(button => button.setAttribute('aria-pressed', String(activeQuartiles.has(Number(button.dataset.quartile)))));
}

async function loadRegion(nextRegion) {
  region = nextRegion; $('#network-status').textContent = 'Loading network…';
  try {
    const response = await fetch(`data/airports/${region}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    graph = await response.json(); activeQuartiles = new Set([0, 1, 2, 3]); transform = { scale: 1, x: 0, y: 0 }; selected = null;
    $$('[data-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.region === region)));
    updateFilterButtons(); updateSummary();
    $('#node-search').value = '';
    $('#node-detail').innerHTML = '<p class="empty-state">Select an airport node to highlight its direct commercial routes.</p>';
    resize();
  } catch (error) {
    $('#network-status').textContent = 'Data could not load';
    $('#node-detail').innerHTML = `<p class="error">${esc(error.message)}. Run the HTTP server described in README; direct file:// opening is unsupported.</p>`;
  }
}

$$('[data-region]').forEach(button => button.addEventListener('click', () => loadRegion(button.dataset.region)));
$$('.quartile-filter').forEach(button => button.addEventListener('click', () => {
  const quartile = Number(button.dataset.quartile);
  if (activeQuartiles.has(quartile) && activeQuartiles.size > 1) activeQuartiles.delete(quartile); else activeQuartiles.add(quartile);
  if (selected !== null && !activeQuartiles.has(graph.nodes[selected].quartile)) selected = null;
  updateFilterButtons();
  if (selected === null) $('#node-detail').innerHTML = '<p class="empty-state">Select a visible airport node to inspect its routes.</p>';
  draw();
}));

$('#node-search-form').addEventListener('submit', event => { event.preventDefault(); selectById($('#node-search').value); });
$('#show-labels').addEventListener('change', draw);
$('#zoom-in').addEventListener('click', () => { transform.scale = Math.min(8, transform.scale * 1.25); draw(); });
$('#zoom-out').addEventListener('click', () => { transform.scale = Math.max(0.6, transform.scale / 1.25); draw(); });
$('#reset-view').addEventListener('click', () => { transform = { scale: 1, x: 0, y: 0 }; draw(); });

canvas.addEventListener('pointerdown', event => { pointer = { x: event.clientX, y: event.clientY, originX: event.clientX, originY: event.clientY, panX: transform.x, panY: transform.y }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => {
  const rect = canvas.getBoundingClientRect(), localX = event.clientX - rect.left, localY = event.clientY - rect.top;
  hover = screenNodes.find(node => Math.hypot(node.x - localX, node.y - localY) <= node.radius + 3)?.index ?? null;
  canvas.style.cursor = pointer ? 'grabbing' : hover !== null ? 'pointer' : 'grab';
  if (pointer) { transform.x = pointer.panX + event.clientX - pointer.x; transform.y = pointer.panY + event.clientY - pointer.y; }
  draw();
});
canvas.addEventListener('pointerup', event => {
  if (pointer && Math.hypot(event.clientX - pointer.originX, event.clientY - pointer.originY) < 5 && hover !== null) { selected = hover; updateNodeDetail(); }
  pointer = null; draw();
});
canvas.addEventListener('pointerleave', () => { hover = null; if (!pointer) draw(); });
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect(), mx = event.clientX - rect.left, my = event.clientY - rect.top;
  const oldScale = transform.scale, nextScale = Math.max(0.6, Math.min(8, oldScale * Math.exp(-event.deltaY * 0.001)));
  transform.x = mx - (mx - transform.x - rect.width / 2) * nextScale / oldScale - rect.width / 2;
  transform.y = my - (my - transform.y - rect.height / 2) * nextScale / oldScale - rect.height / 2;
  transform.scale = nextScale; draw();
}, { passive: false });
canvas.addEventListener('keydown', event => {
  const moves = { ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] };
  if (moves[event.key]) { event.preventDefault(); transform.x += moves[event.key][0]; transform.y += moves[event.key][1]; draw(); }
  if (event.key === '+' || event.key === '=') { event.preventDefault(); transform.scale = Math.min(8, transform.scale * 1.2); draw(); }
  if (event.key === '-') { event.preventDefault(); transform.scale = Math.max(0.6, transform.scale / 1.2); draw(); }
});

window.addEventListener('resize', resize);
loadRegion(region);
