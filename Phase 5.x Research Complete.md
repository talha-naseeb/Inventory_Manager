phase 5.x: WebSocket Enhancements & Mobile Scan Mode
🎯 Overview
This phase extends the Cloud Bridge with real-time bidirectional communication for live dashboard updates and mobile device integration via QR-based WebSocket pairing.

🔌 Feature 1: WebSocket Integration for Live Dashboard Updates
Architecture
WebSocket
Changes
Broadcast
Cloud Server
WebSocket Service
Dashboard Component
POS Component
Inventory Component
SQLite
Technical Approach

1. WebSocket Service Layer
   Location: src/services/websocketService.ts
   Responsibilities:
   Establish secure wss:// connection to cloud server
   Handle reconnection with exponential backoff
   Subscribe to specific event channels (e.g., orders, inventory, staff)
   Emit local changes to cloud for multi-terminal sync
2. Electron Integration Considerations
   IPC Bridge Pattern: WebSocket connections should be managed in the main process (Node.js), not the renderer
   Why?: Electron's security model restricts direct WebSocket usage in renderer processes
   Solution: Use IPC channels (websocket:subscribe, websocket:emit) to proxy messages between renderer and main process
   Benefit: Centralized connection management, better resource control
3. React Integration
   Custom Hook: useWebSocket(channel: string)
   typescript
   const { data, isConnected } = useWebSocket('dashboard:stats');
   State Management: Use Zustand store to cache WebSocket data
   Performance Optimization:
   Batch updates to prevent excessive re-renders
   Use React.memo for expensive chart components
   Debounce high-frequency updates (e.g., live order counts)
4. Dashboard Live Updates
   Real-time Metrics:
   Order count (increments on new sale)
   Revenue totals (updates on payment completion)
   Low stock alerts (triggers on inventory threshold)
   Active staff sessions (shows who's logged in)
   Visual Feedback:
   Animated counters for numeric changes
   Toast notifications for critical events
   Pulse effects on updated cards
   Implementation Steps
   Create WebSocket Service (websocketService.ts)

Connection lifecycle management
Event subscription/unsubscription
Automatic reconnection logic
Electron Main Process Handler (electron/websocket.cjs)

Establish WebSocket connection on app start
Expose IPC handlers for renderer communication
Forward messages bidirectionally
React Hook (useWebSocket.ts)

Subscribe to IPC events
Provide connection status
Return latest data for subscribed channel
Dashboard Integration

Update stat cards with live data
Add connection status indicator
Implement optimistic UI updates
Best Practices (from Research)
✅ Use wss:// for secure connections
✅ Implement exponential backoff for reconnection (start at 1s, max 30s)
✅ Batch updates to reduce re-renders (use requestAnimationFrame)
✅ Limit historical data in memory (keep last 100 events)
✅ Use 127.0.0.1 instead of localhost to avoid macOS security prompts
✅ Offload heavy computations to Web Workers
✅ Implement heartbeat/ping-pong to detect stale connections
📱 Feature 2: Mobile Scan Mode (QR-based WebSocket Link)
Architecture
Mobile Device
Cloud Server
POS Terminal
Mobile Device
Cloud Server
POS Terminal
Generate session QR code
Return QR + session ID
Display QR on screen
Scan QR code
Connect via WebSocket (session ID)
Notify mobile connected
Send scanned product barcode
Forward barcode to POS
Add product to cart
Confirm item added
Show confirmation
Use Cases
Mobile Product Scanning

Customer/staff uses phone camera to scan product barcodes
Items instantly appear in POS cart
Useful for large items or warehouse-style checkouts
Remote Cart Management

Customer builds cart on mobile while browsing
Walks to counter, cart already populated
Cashier completes payment
Mobile Payment Confirmation

Customer scans QR to authorize payment
Mobile wallet integration
Instant payment confirmation to POS
Technical Implementation

1. QR Code Generation
   Library: qrcode (npm package)
   Content: wss://cloud.inventoriman.com/scan?session={uuid}
   Session Management:
   Generate unique session ID on POS
   Store session in Redis (cloud) with 5-minute TTL
   Map session to specific POS terminal
2. Mobile Web App
   Technology: Progressive Web App (PWA)
   Camera Access: HTML5 getUserMedia() API
   Barcode Scanning: @zxing/library or quagga2
   WebSocket Client: Native WebSocket API
   Flow:
   Scan QR code (extracts WebSocket URL + session)
   Request camera permission
   Connect to WebSocket server
   Scan product barcodes
   Send barcode data via WebSocket
   Display confirmation feedback
3. POS Terminal Integration
   QR Display Modal: Show QR code in overlay
   Connection Status: "Waiting for mobile..." → "Mobile connected ✓"
   Auto-add Products: Listen for WebSocket events, add to cart
   Session Timeout: Auto-close after 5 minutes of inactivity
4. Security Considerations
   ✅ Session-based authentication (no persistent credentials)
   ✅ Short-lived sessions (5-minute TTL)
   ✅ HTTPS/WSS only (encrypted transport)
   ✅ Rate limiting on barcode scans (prevent abuse)
   ✅ Session invalidation on POS logout
   Implementation Steps
   Cloud Server WebSocket Endpoint

/scan?session={id} route
Session validation middleware
Message routing between mobile and POS
POS QR Code Modal (ScanModeModal.tsx)

Generate session ID
Display QR code
Show connection status
Handle incoming barcode events
Mobile PWA (separate repository)

QR scanner landing page
Camera barcode scanner
WebSocket client
Feedback UI (item added, errors)
POS Store Integration

Add useScanModeStore for session management
Integrate with usePOSStore to add scanned items
Handle WebSocket events in
App.tsx
🚀 Recommended Implementation Order
Phase 5.x.1: WebSocket Foundation (Week 1)
✅ Create websocketService.ts with basic connection logic
✅ Implement Electron IPC bridge for WebSocket
✅ Build useWebSocket React hook
✅ Add connection status indicator to header
Phase 5.x.2: Live Dashboard (Week 2)
✅ Integrate WebSocket into Dashboard stats
✅ Add real-time order count updates
✅ Implement animated counters
✅ Add toast notifications for events
Phase 5.x.3: Mobile Scan Mode (Week 3-4)
✅ Build QR code generation in POS
✅ Create cloud WebSocket endpoint
✅ Develop mobile PWA scanner
✅ Integrate barcode events into POS cart
📊 Success Metrics
WebSocket Uptime: >99.5% connection stability
Message Latency: <100ms for local network, <500ms for cloud
Mobile Scan Speed: <2 seconds from scan to POS display
Reconnection Time: <5 seconds after network restoration
🔧 Required Dependencies
json
{
"dependencies": {
"ws": "^8.16.0", // WebSocket server (cloud)
"qrcode": "^1.5.3", // QR code generation
"@zxing/library": "^0.20.0" // Barcode scanning (mobile)
}
}
⚠️ Challenges & Mitigations
Challenge Mitigation
Electron WebSocket restrictions Use IPC bridge pattern in main process
Mobile camera permissions Clear UX prompts, fallback to manual entry
Network latency Optimistic UI updates, local caching
Session security Short TTLs, HTTPS/WSS only, rate limiting
Cross-platform camera support Use well-tested libraries (ZXing, Quagga)
NOTE

Phase 5.x is optional and can be implemented incrementally. The core sync engine (Phase 5) is fully functional without these enhancements.

TIP

Start with WebSocket Live Dashboard first, as it provides immediate value and lays the foundation for Mobile Scan Mode.

Comment
Ctrl+Alt+M
