import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrinterMonitor from './PrinterMonitor';

jest.mock('../components/Navbar', () => () => null);
jest.mock('../utils/apiUrls', () => ({ getApiUrls: () => ({ lexiconApiUrl: 'https://api.example.com' }) }));

afterEach(() => {
  delete global.fetch;
  jest.useRealTimers();
});

test('shows live camera and status from the authenticated backend', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      connected: true, state: 'Printing', jobName: 'cube.gcode', progress: 42.5,
      elapsedSeconds: 120, remainingSeconds: 3600, toolActual: 215, toolTarget: 220,
      bedActual: 60, bedTarget: 60,
    }),
  });
  render(<MemoryRouter><PrinterMonitor /></MemoryRouter>);
  expect(await screen.findByText('cube.gcode')).toBeInTheDocument();
  expect(screen.getByText('42.5%')).toBeInTheDocument();
  expect(screen.getByText('215.0 °C / 220.0 °C')).toBeInTheDocument();
  expect(screen.getByText('1h 0m')).toBeInTheDocument();
  expect(screen.getByAltText('Live view of the 3D printer')).toHaveAttribute('src',
    'https://api.example.com/api/printer-monitor/camera?attempt=0');
  expect(global.fetch.mock.calls[0][1].credentials).toBe('include');
});

test('shows errors and retries the camera', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'OctoPrint offline' }) });
  render(<MemoryRouter><PrinterMonitor /></MemoryRouter>);
  expect(await screen.findByText('OctoPrint offline')).toBeInTheDocument();
  fireEvent.error(screen.getByAltText('Live view of the 3D printer'));
  expect(screen.getByText('Camera unavailable or stream interrupted.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry camera' }));
  expect(screen.getByAltText('Live view of the 3D printer')).toHaveAttribute('src',
    'https://api.example.com/api/printer-monitor/camera?attempt=1');
});

test('stops polling when the page unmounts', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: false }) });
  const { unmount } = render(<MemoryRouter><PrinterMonitor /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Not operational')).toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  const signal = global.fetch.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(20000); });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
