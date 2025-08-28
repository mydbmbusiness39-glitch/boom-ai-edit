// Phase 2 Testing Analytics - Console Logging
interface AnalyticsEvent {
  event: string;
  userId?: string;
  timestamp: string;
  properties?: Record<string, any>;
  phase: string;
}

class TestAnalytics {
  private debugMode: boolean = true;
  private events: AnalyticsEvent[] = [];

  constructor() {
    console.log('🔧 Test Analytics Initialized - Phase 2');
  }

  track(event: string, properties?: Record<string, any>, userId?: string) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      userId,
      timestamp: new Date().toISOString(),
      properties,
      phase: '2.1-test'
    };

    this.events.push(analyticsEvent);

    if (this.debugMode) {
      console.group('🔧 Analytics Event');
      console.log('Event:', event);
      console.log('User:', userId || 'anonymous');
      console.log('Properties:', properties);
      console.log('Timestamp:', analyticsEvent.timestamp);
      console.groupEnd();
    }

    // Store in localStorage for debugging
    localStorage.setItem('test-analytics', JSON.stringify(this.events.slice(-50)));
  }

  // Common test events
  trackAuth(action: 'login' | 'logout' | 'signup', email?: string) {
    this.track(`auth_${action}`, { email });
  }

  trackDashboard(action: 'view' | 'refresh' | 'create_session') {
    this.track(`dashboard_${action}`);
  }

  trackUpload(action: 'start' | 'complete' | 'error', fileInfo?: any) {
    this.track(`upload_${action}`, fileInfo);
  }

  trackSettings(action: 'save' | 'clear_data' | 'view') {
    this.track(`settings_${action}`);
  }

  // Get stored events for debugging
  getEvents(): AnalyticsEvent[] {
    const stored = localStorage.getItem('test-analytics');
    return stored ? JSON.parse(stored) : this.events;
  }

  clearEvents() {
    this.events = [];
    localStorage.removeItem('test-analytics');
    console.log('🔧 Analytics events cleared');
  }
}

export const testAnalytics = new TestAnalytics();