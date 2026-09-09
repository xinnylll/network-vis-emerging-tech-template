import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest = read('dist/data/airports/manifest.json');
const expected = { brazil: [131, 1003], europe: [399, 5993], usa: [1190, 13599] };

assert.equal(manifest.dataset, 'anomalypoint/NEExT');
assert.equal(manifest.subset, 'airports');
assert.match(manifest.revision, /^[0-9a-f]{40}$/);

for (const item of manifest.graphs) {
  const [nodeCount, edgeCount] = expected[item.region];
  const graph = read(`dist/data/airports/${item.region}.json`);
  assert.equal(graph.nodes.length, nodeCount);
  assert.equal(graph.edges.length, edgeCount);
  assert.equal(graph.meta.node_count, nodeCount);
  assert.equal(graph.meta.edge_count, edgeCount);
  assert.equal(graph.meta.source_revision, manifest.revision);
  assert.deepEqual(new Set(graph.nodes.map(node => node.quartile)), new Set([0, 1, 2, 3]));

  const ids = new Set(graph.nodes.map(node => node.id));
  assert.equal(ids.size, nodeCount);
  const degrees = Array(nodeCount).fill(0);
  const edgeKeys = new Set();
  for (const [source, target] of graph.edges) {
    assert(Number.isInteger(source) && source >= 0 && source < nodeCount);
    assert(Number.isInteger(target) && target >= 0 && target < nodeCount);
    assert.notEqual(source, target);
    const key = source < target ? `${source}:${target}` : `${target}:${source}`;
    assert(!edgeKeys.has(key), `duplicate edge ${item.region} ${key}`);
    edgeKeys.add(key); degrees[source]++; degrees[target]++;
  }
  graph.nodes.forEach((node, index) => {
    assert.equal(node.degree, degrees[index]);
    assert(Number.isFinite(node.x) && node.x >= 0 && node.x <= 1);
    assert(Number.isFinite(node.y) && node.y >= 0 && node.y <= 1);
  });
  assert.equal(fs.readFileSync(`dist/data/airports/${item.region}-nodes.csv`, 'utf8').trim().split(/\r?\n/).length, nodeCount + 1);
  assert.equal(fs.readFileSync(`dist/data/airports/${item.region}-edges.csv`, 'utf8').trim().split(/\r?\n/).length, edgeCount + 1);
  assert.equal(hash(`dist/data/airports/${item.region}-nodes.csv`), item.node_csv_sha256);
  assert.equal(hash(`dist/data/airports/${item.region}-edges.csv`), item.edge_csv_sha256);
}

for (const html of ['dist/index.html', 'dist/deploy.html']) {
  const body = fs.readFileSync(html, 'utf8');
  for (const match of body.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const url = match[1];
    if (/^(https?:|data:)/.test(url)) continue;
    assert(fs.existsSync(path.resolve(path.dirname(html), url)), `Missing asset: ${url}`);
  }
}

const html = fs.readFileSync('dist/index.html', 'utf8');
const app = fs.readFileSync('dist/app.js', 'utf8');
for (const match of app.matchAll(/\$\('#([^']+)'\)/g)) assert(html.includes(`id="${match[1]}"`), `Missing DOM id: ${match[1]}`);
const publicText = html + fs.readFileSync('README.md', 'utf8');
assert(!/SceneFun3D|point cloud|affordance explorer/i.test(publicText));
console.log('PASS: NEExT graph counts, quartiles, edges, degrees, coordinates, CSV hashes, and site links.');
