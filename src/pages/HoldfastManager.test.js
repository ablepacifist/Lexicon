import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HoldfastManager from './HoldfastManager';
import { UserContext } from '../context/UserContext';
import { resetHoldfastManifest } from '../components/holdfast/HoldfastIcon';

jest.mock('../components/Navbar', () => () => null);
jest.mock('../utils/apiUrls', () => ({
  getApiUrls: () => ({ lexiconApiUrl: 'https://api.example.com', alchemyApiUrl: 'https://alchemy.example.com' }),
}));

const HOLDFAST = {
  groupName: 'party', holdfastName: 'Lockwood', daysElapsed: 9, gold: 120, population: 30,
  happiness: 70, castleType: 'wood_fort', food: 50, wood: 3, stone: 2, iron: 1, beer: 0, wine: 0, tools: 0,
  buildings: { granary: 1 },
};
// Shaped like alchemyServer's GET /api/holdfast/{group}: every derived value is precomputed there.
const STATUS = {
  holdfast: HOLDFAST, buildingMenu: [], netDailyGold: 1, dailyIncome: 2, dailyUpkeep: 1, protection: 50, raidChance: 1, raidChanceWeek: 6.79,
  targetHappiness: 75, daysOfFood: 999, nextSpoilIn: -1,
  calendar: { day: 9, week: 2, weeksElapsed: 1, dayOfWeek: 2 },
  castleName: 'Wood Fort', populationTrend: null, happinessLevel: 'ok',
  food: { amount: 50, dailyNeed: 6, daysOfFood: 999, level: 'warn', nextSpoilIn: -1, spoilLevel: 'ok', shelfLife: 45 },
  resources: [
    { key: 'gold', label: 'Gold', amount: 120, level: 'ok' },
    { key: 'food', label: 'Food', amount: 50, level: 'warn' },
    { key: 'wood', label: 'Wood', amount: 3, level: 'ok' },
  ],
  builtBuildings: [{ type: 'granary', name: 'Granary', count: 1 }],
  crops: [], fallowFields: [],
  foodMarket: { available: false },
};
const MANIFEST = {
  version: 1,
  assets: {
    'resource.wood': { label: 'Wood', emoji: 'W', url: '/api/holdfast/assets/resources/wood.png?v=1' },
    'building.granary': { label: 'Granary', emoji: 'G' },
  },
};

function json(body, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body, text: async () => JSON.stringify(body) });
}

function fakeBackend(overrides = {}) {
  return jest.fn((url, init = {}) => {
    const method = init.method || 'GET';
    if (url.endsWith('/api/holdfast/assets/manifest')) return json(MANIFEST);
    if (url.endsWith('/api/holdfast/all')) return json([HOLDFAST]);
    if (url.endsWith('/api/holdfast/party/events')) return json([]);
    if (url.endsWith('/api/holdfast/party') && method === 'GET') return json(STATUS);
    if (url.endsWith('/api/auth/sso/generate-token')) return json({ token: 'one-use-token', expiresInSeconds: 60 });
    if (overrides[url]) return overrides[url](init);
    return json({}, false, 404);
  });
}

function renderAs(user) {
  return render(
    <UserContext.Provider value={{ user, setUser: () => {} }}>
      <MemoryRouter><HoldfastManager /></MemoryRouter>
    </UserContext.Provider>,
  );
}

async function openHoldfast() {
  fireEvent.click(await screen.findByText('Lockwood'));
  await screen.findByText(/Day 9 · week 2/);
}

beforeEach(() => resetHoldfastManifest());
afterEach(() => { delete global.fetch; });

const player = { id: 2, username: 'someone', role: 'USER', permissions: [] };
const admin = { id: 1, username: 'zx', role: 'ADMIN', permissions: ['HOLDFAST_ADVANCE_TIME', 'HOLDFAST_DELETE'] };

test('a player sees the day but cannot advance time or delete', async () => {
  global.fetch = fakeBackend();
  renderAs(player);
  await openHoldfast();
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Time/ }));
  expect(screen.getByText(/Time is advanced by an admin/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Advance/ })).not.toBeInTheDocument();
});

test('an admin advances time with a fresh Lexicon SSO token', async () => {
  const advance = jest.fn(() => json({ status: 200, success: true, events: ['Day 10: quiet'], eventEntries: [{ message: 'Day 10: quiet', tone: 'normal' }] }));
  global.fetch = fakeBackend({ 'https://alchemy.example.com/api/holdfast/advance': advance });
  renderAs(admin);
  await openHoldfast();
  expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Time/ }));
  fireEvent.click(screen.getByRole('button', { name: /Advance 7 Day/ }));
  await waitFor(() => expect(advance).toHaveBeenCalled());
  const init = advance.mock.calls[0][0];
  expect(init.headers['X-Lexicon-Sso']).toBe('one-use-token');
  expect(JSON.parse(init.body)).toEqual({ groupName: 'party', days: 7 });
  expect(await screen.findByText('Day 10: quiet')).toBeInTheDocument();
});

test('the server refusal is shown when a stale admin view tries to advance', async () => {
  const advance = jest.fn(() => json({ status: 403, success: false, message: 'Only an admin can advance time.' }, false, 403));
  global.fetch = fakeBackend({ 'https://alchemy.example.com/api/holdfast/advance': advance });
  renderAs(admin);
  await openHoldfast();
  fireEvent.click(screen.getByRole('button', { name: /Time/ }));
  fireEvent.click(screen.getByRole('button', { name: /Advance 7 Day/ }));
  expect(await screen.findByText(/Only an admin can advance time./)).toBeInTheDocument();
});

test('asset manifest: images where a file exists, emoji otherwise', async () => {
  global.fetch = fakeBackend();
  renderAs(player);
  await openHoldfast();
  const wood = await screen.findAllByAltText('Wood');
  expect(wood[0]).toHaveAttribute('src', 'https://alchemy.example.com/api/holdfast/assets/resources/wood.png?v=1');
  expect(screen.getAllByLabelText('Granary')[0]).toHaveTextContent('G');
  // a broken image falls back to the emoji
  fireEvent.error(wood[0]);
  await waitFor(() => expect(screen.getAllByLabelText('Wood')[0]).toHaveTextContent('W'));
});

test('crop progress, replant cost and affordability are shown exactly as the server sends them', async () => {
  const status = {
    ...STATUS,
    crops: [{
      type: 'wheat_field', label: 'Wheat Fields', annual: true, planted: 1, showProgress: true, harvestDays: 14,
      harvestFood: 20, harvestGold: 0,
      fields: [{ field: 1, plantDay: 0, grownDays: 5, harvestDays: 14, percent: 37, ready: false }],
    }],
    fallowFields: [{ type: 'rye_field', label: 'Rye Fields', fallow: 2, seedCost: 12, replantCost: 999, canAfford: false }],
    buildingMenu: [{
      type: 'guard_tower', name: 'Guard Tower', description: 'd', current: 0, max: null, status: 'available', cost: 25,
      dailySilver: 0, dailyUpkeep: 17, happiness: 0,
      resourceRequirements: [{ resource: 'wood', needed: 4, have: 3, enough: false }],
      canAffordResources: false, canAffordGold: true, canBuild: false,
    }],
  };
  global.fetch = jest.fn((url, init = {}) => {
    if (url.endsWith('/api/holdfast/party') && (init.method || 'GET') === 'GET') return json(status);
    return fakeBackend()(url, init);
  });
  renderAs(player);
  await openHoldfast();
  // 37% is the server's figure; the page does not recompute it from the days
  expect(screen.getByText('Field 1: 5/14d (37%)')).toBeInTheDocument();
  const replant = screen.getByRole('button', { name: /Replant all — 999g/ });
  expect(replant).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Build/ }));
  expect(screen.getByText((_, el) => el.classList?.contains('res-req') && el.textContent.includes('4 wood (3)'))).toHaveClass('res-missing');
  expect(screen.getByRole('button', { name: /Build — 25g/ })).toHaveClass('btn-build-short');
});

test('event lines are coloured by the tone the server gives them', async () => {
  global.fetch = jest.fn((url, init = {}) => {
    if (url.endsWith('/api/holdfast/party/events')) return json([{ id: 1, day: 3, message: 'Something odd', tone: 'danger' }]);
    return fakeBackend()(url, init);
  });
  renderAs(player);
  await openHoldfast();
  fireEvent.click(screen.getByRole('button', { name: /Log/ }));
  await screen.findByText('Something odd');
  expect(screen.getByText((_, el) => el.classList?.contains('event-line') && el.textContent.includes('Something odd'))).toHaveClass('event-danger');
});

test('the raid chance says it is per day and shows the weekly figure from the server', async () => {
  global.fetch = fakeBackend();
  renderAs(player);
  await openHoldfast();
  expect(screen.getByText(/raid: 1\.0%\/day · 7%\/week/)).toBeInTheDocument();
});
