import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App';

// Mock the lazy-loaded components to avoid async loading issues in tests
vi.mock('../../components/ChatConcierge', () => ({
  default: () => <div data-testid="chat-concierge">ChatConcierge</div>,
}));
vi.mock('../../components/NavigationAssistant', () => ({
  default: () => <div data-testid="nav-assistant">NavigationAssistant</div>,
}));
vi.mock('../../components/StaffDashboard', () => ({
  default: () => <div data-testid="staff-dashboard">StaffDashboard</div>,
}));
vi.mock('../../components/StaffChat', () => ({
  default: () => <div data-testid="staff-chat">StaffChat</div>,
}));

describe('App Component', () => {
  it('renders home page by default with hero title', () => {
    render(<App />);
    expect(screen.getByText(/Stadium Companion/)).toBeInTheDocument();
  });

  it('shows FIFA 2026 branding in header', () => {
    render(<App />);
    expect(screen.getByText('FIFA 2026')).toBeInTheDocument();
    expect(screen.getByText('Smart Stadium Hub')).toBeInTheDocument();
  });

  it('shows LIVE indicator in header', () => {
    render(<App />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('displays navigation buttons', () => {
    render(<App />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    // Use getAllByText since "Fan Mode" and "Staff Mode" appear in nav and home cards
    expect(screen.getAllByText('Fan Mode').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Staff Mode').length).toBeGreaterThanOrEqual(1);
  });

  it('shows all 6 feature cards on home page', () => {
    render(<App />);
    expect(screen.getByText('AI Concierge')).toBeInTheDocument();
    expect(screen.getByText('Smart Navigation')).toBeInTheDocument();
    expect(screen.getByText('Live Weather')).toBeInTheDocument();
    expect(screen.getByText('Match Scores')).toBeInTheDocument();
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Ops Intelligence')).toBeInTheDocument();
  });

  it('shows mode entry buttons on home page', () => {
    render(<App />);
    expect(screen.getByText('Enter Fan Mode →')).toBeInTheDocument();
    expect(screen.getByText('Sign In Required →')).toBeInTheDocument();
  });

  it('switches to fan mode when nav button clicked', async () => {
    render(<App />);
    // Click the nav button specifically (by ID)
    fireEvent.click(document.getElementById('mode-fan-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('chat-concierge')).toBeInTheDocument();
      expect(screen.getByTestId('nav-assistant')).toBeInTheDocument();
    });
  });

  it('shows login modal when Staff Mode nav button is clicked', () => {
    render(<App />);
    fireEvent.click(document.getElementById('mode-staff-btn'));
    expect(screen.getByText('Staff Access')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@fifa2026.com')).toBeInTheDocument();
  });

  it('cancel button in login modal dismisses it', () => {
    render(<App />);
    fireEvent.click(document.getElementById('mode-staff-btn'));
    expect(screen.getByText('Staff Access')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel — Back Home'));
    expect(screen.queryByText('Staff Access')).not.toBeInTheDocument();
  });

  it('returns to home page when Home nav button is clicked', async () => {
    render(<App />);
    fireEvent.click(document.getElementById('mode-fan-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('chat-concierge')).toBeInTheDocument();
    });
    fireEvent.click(document.getElementById('mode-home-btn'));
    expect(screen.getByText(/Stadium Companion/)).toBeInTheDocument();
    expect(screen.getByText('Enter Fan Mode →')).toBeInTheDocument();
  });

  it('clicking "Enter Fan Mode →" card switches to fan mode', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Enter Fan Mode →'));
    await waitFor(() => {
      expect(screen.getByTestId('chat-concierge')).toBeInTheDocument();
    });
  });

  it('shows footer on all pages', () => {
    render(<App />);
    expect(screen.getByText(/Built for fans, volunteers/)).toBeInTheDocument();
  });

  it('shows powered-by text on home', () => {
    render(<App />);
    expect(screen.getByText(/Powered by Google Gemini AI/)).toBeInTheDocument();
  });
});
