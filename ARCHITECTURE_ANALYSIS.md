# Potso AI - Architecture Analysis

## Overview
Potso AI is a **full-stack multi-agent intelligence system** powered by Google Gemini with web, mobile, and backend components. It features four collaborative agents (Modisa, Tshepo, Kgakgamatso, Tlhaloganyo) that work together to provide multi-perspective AI responses.

---

## 1. Web App Components (`/src`)

### **Existing Components:**

#### `App.tsx` (Main Application)
- **Purpose**: Root React component with full chat interface
- **Key Features**:
  - Multi-agent chat management with localStorage persistence
  - Settings panel for agent customization
  - Voice/speech settings (language, accent, speed)
  - Live voice modal integration
  - File attachment support (base64 encoding)
  - Speech-to-text dictation
  - Debug mode for reasoning visualization
  - Chat sidebar with history management
  
- **State Management**:
  - Chat array with localStorage fallback (quota management)
  - Agent configurations
  - Voice settings
  - Input, attachments, and reasoning state

#### `components/LiveVoiceModal.tsx`
- **Purpose**: Real-time voice interaction with Gemini Live API
- **Key Features**:
  - AudioContext for PCM16 audio handling
  - Base64 audio decoding
  - Integration with @google/genai Live API
  - Three.js 3D visualization (though incomplete in current code)
  - Audio buffer source scheduling
  - Browser Audio API integration

#### `components/ErrorBoundary.tsx`
- **Purpose**: React error boundary for crash handling
- **Features**:
  - Catches unhandled React errors
  - Displays error messages with code view
  - Page refresh button for recovery

#### `types.ts`
- **Defines Core Types**:
  - `AgentId`: Union of 4 agent names (modisa, tshepo, kgakgamatso, tlhaloganyo)
  - `Agent`: Agent configuration (id, name, role, icon)
  - `ReasoningStep`: Individual agent reasoning with delegation tracking
  - `Artifact`: Generated outputs (code, data, text, image)
  - `Attachment`: File uploads with MIME type and base64 data
  - `Message`: Chat message with reasoning array, tags, and artifacts
  - `Chat`: Conversation with messages and metadata
  - `AGENTS`: Default agent definitions (Researcher, Synthesizer, Auditor, Narrator)

#### `services/apiService.ts`
- **Methods**:
  - `getMultiAgentResponse()`: Calls backend to get AI responses with reasoning

#### `services/geminiService.ts` (Client-side)
- Handles direct Gemini API calls (supports both backend and frontend)

### **Missing/Underdeveloped Components:**

| Gap | Impact | Priority |
|-----|--------|----------|
| No chat export/import functionality | Users can't backup conversations | Medium |
| No artifact viewer/editor component | Code/data artifacts not interactive | Medium |
| No image generation integration | ImagePrompt field not fully utilized | Low |
| Three.js visualization incomplete | LiveVoiceModal visualization broken | Medium |
| No mobile-responsive layout | Mobile web viewing degraded | High |
| No search/filter within chats | Hard to find past conversations | Medium |
| No message editing/deletion UI | Can't correct mistakes after sending | Medium |
| No user preferences persistence | Voice settings reset on page load | Low |

---

## 2. Mobile App Structure (`/mobile/app`)

### **Existing Screens:**

#### `_layout.tsx` (Root Layout)
- **Purpose**: Navigation container with Firebase auth state monitoring
- **Features**:
  - Firebase initialization with environment variables
  - Auth state change listener
  - Stack navigation with custom header styling
  - Routes: `(tabs)` and `auth`

#### `(tabs)/_layout.tsx` (Tab Navigation)
- **Purpose**: Bottom tab navigation for main app
- **Features**:
  - Two tabs: Chat & Settings
  - Custom styling with Tailwind/lucide-react-native
  - Cyan accent color (#13c8ec)

#### `(tabs)/chat.tsx` (Chat Screen)
- **Purpose**: Mobile chat interface
- **Features**:
  - Message list with FlatList
  - Text input with send button
  - Loading state during API calls
  - Firebase auth token integration
  - Displays reasoning & tags from AI responses
  - Welcome message for new users

#### `(tabs)/settings.tsx` (Settings Screen)
- **Purpose**: User configuration and app info
- **Features**:
  - User profile display (email)
  - Dark mode toggle
  - Notification toggle
  - App version display
  - Logout functionality with navigation

### **Missing Components:**

| Missing Feature | Impact | Priority |
|-----------------|--------|----------|
| **Auth screens** | No login/signup UI | Critical |
| **Mobile API service** | Duplicated API logic from web | High |
| **Camera/Image capture** | Can't take photos for analysis | Medium |
| **Voice input on mobile** | Limited accessibility | Medium |
| **Message history persistence** | Messages lost on app restart | High |
| **Push notifications** | Users won't be notified | Medium |
| **Share/Export** | Can't share conversation results | Low |
| **Agent selection UI** | No way to choose which agent to query | Medium |
| **Loading skeletons** | Poor UX while fetching | Low |
| **Empty state screens** | First-time user experience weak | Low |

---

## 3. Backend Routes (`/backend/routes`)

### **auth.ts**
**Endpoints:**
- `GET /profile` - Retrieve user profile (name, email, preferences)
- `PUT /profile` - Update user profile (displayName, photoURL, preferences)
- `POST /init-user` - First-time user initialization in Firestore

**Features:**
- Firebase Auth integration
- User document management in Firestore
- Token verification middleware

### **chat.ts**
**Endpoints:**
- `GET /chats` - List all chats for user (ordered by creation)
- `POST /chats` - Create new chat with title
- `GET /chats/:chatId/messages` - Retrieve chat message history
- `POST /chats/:chatId/messages` - Save user message and get AI response

**Features:**
- Firestore subcollection architecture (users → chats → messages)
- Message persistence
- Gemini API integration with chat history context
- Attachment support (images, files)
- Streaming response handling (if implemented)

**Gaps:**
- No message update/delete endpoints
- No chat deletion endpoint
- No sharing/public chat links
- No search functionality
- No export endpoints

---

## 4. Backend Services (`/backend/services`)

### **geminiService.ts**
**Capabilities:**
- Multi-agent reasoning with structured JSON schema
- Response generation using `gemini-3-flash-preview` model
- System instruction for agent role-playing
- Structured output with:
  - Reasoning array (3-4 steps with delegation)
  - Artifacts (code, data, text, image)
  - Tags for classification
  - Primary agent delivery identification
  - Consensus flag

**Features:**
- Sliding window for last 10 messages (context optimization)
- JSON response parsing with fallback
- Error handling with fallback responses
- Inline data support for attachments

**Missing:**
- Image generation (imagePrompt captured but not used)
- Streaming responses
- Token counting
- Cost tracking
- Rate limiting
- Cache layer

---

## 5. Type System (`src/types.ts`)

### **Defined Types:**

```typescript
AgentId = 'modisa' | 'tshepo' | 'kgakgamatso' | 'tlhaloganyo'

Agent {
  id: AgentId
  name: string
  role: string (Researcher, Synthesizer, Auditor, Narrator)
  icon: string (Lucide icon name)
}

Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: ReasoningStep[]
  tags?: string[]
  activeAgentId?: AgentId
  imageUrl?: string
  artifacts?: Artifact[]
  consensusReached?: boolean
  attachments?: Attachment[]
  isFormulating?: boolean
}

Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

Artifact {
  id: string
  title: string
  content: string
  type: 'code' | 'data' | 'text' | 'image'
  createdBy: AgentId
}

Attachment {
  name: string
  mimeType: string
  data: string (base64)
}

ReasoningStep {
  agentId: AgentId
  thought: string
  delegatedTo?: AgentId
  action?: string
}
```

### **Type System Gaps:**

- No `User` type definition
- No `UserPreferences` type
- No `ChatMetadata` type (for sharing, privacy settings)
- No `FileUploadResponse` type
- No `ErrorResponse` type for API consistency
- No `StreamingMessage` type for real-time responses

---

## 6. Overall Architecture Gaps & Missing Features

### **Critical Missing Features:**

| Feature | Current State | Impact | Effort |
|---------|---------------|--------|--------|
| **Authentication Flow** | Partially implemented (backend only) | Users can't sign up/log in | High |
| **Real Auth UI** | None in mobile/web | Can't access app | Critical |
| **Database Schema** | Only chats & users, no schemas | No data validation | Medium |
| **Error Handling** | Basic try/catch | Poor UX on failures | Medium |
| **Image Generation** | Schema defined but not implemented | Feature incomplete | Medium |
| **Streaming Responses** | Not implemented | Slow perceived latency | High |
| **Input Validation** | Minimal | Security issues possible | Medium |
| **API Rate Limiting** | Not implemented | Abuse vulnerability | Medium |
| **Logging/Monitoring** | Console.log only | Can't debug production | Medium |
| **Unit Tests** | None | Code reliability unknown | High |
| **E2E Tests** | None | Integration broken silently | High |
| **CI/CD Pipeline** | Not set up | Manual deployments | Medium |
| **Environment Config** | .env.example only | Easy to misconfigure | Low |

### **Architectural Weaknesses:**

1. **Frontend-Backend Separation**
   - App.ts duplicates geminiService in `/src/services/geminiService.ts` and backend
   - No clear API contract (no OpenAPI/Swagger)
   - Chat persistence split between localStorage and Firestore

2. **Mobile Development**
   - Components folder empty (no reusable mobile components)
   - Services folder empty (duplicates web logic)
   - No auth flow implementation
   - Missing many common mobile UX patterns

3. **State Management**
   - No Redux/Zustand (using localStorage for persistence)
   - Prop drilling risk in React components
   - No optimistic updates

4. **Security**
   - No input sanitization
   - No CORS hardening
   - Firebase security rules not shown
   - No request signature validation

5. **Performance**
   - No response caching
   - Large chat histories kill localStorage
   - No pagination in message lists
   - No image compression before upload

### **Infrastructure Gaps:**

- **No database migrations** for schema updates
- **No secrets management** beyond env files
- **No CDN** for static assets
- **No analytics** tracking
- **No error tracking** (Sentry/DataDog)
- **No performance monitoring**
- **No database backups** shown
- **No disaster recovery** plan

---

## 7. Data Flow Architecture

```
┌─────────────────┐
│   React Web UI  │
└────────┬────────┘
         │ fetch() + Bearer token
         ▼
┌─────────────────────────────────┐
│    Express Backend (8080)       │
│  - Auth Middleware              │
│  - Routes: /auth, /chat         │
└────────┬────────────────────────┘
         │ 
    ┌────┴─────┐
    ▼          ▼
┌────────┐  ┌──────────────────┐
│Firebase│  │Google Gemini API │
│(Stores)│  │ (Intelligence)   │
└────────┘  └──────────────────┘

┌─────────────────┐
│   React Native  │
│    Mobile App   │
└────────┬────────┘
         │ fetch() + Bearer token
         ▼ (Same Express Backend)
```

---

## 8. Deployment Status

### **Current Setup:**
- Dockerfile exists (multi-stage build)
- docker-compose.yml for local orchestration
- DEPLOYMENT.md with Cloud Run/AWS instructions

### **Not Implemented:**
- GitHub Actions CI/CD
- Automatic testing pipelines
- Database migration automation
- Environment promotion strategy (dev → staging → prod)

---

## Summary: Priority Action Items

### **Phase 1: Core Functionality (Blocked)**
- [ ] Complete authentication UI (mobile + web)
- [ ] Fix LiveVoiceModal 3D visualization
- [ ] Implement image generation feature
- [ ] Add message edit/delete functionality

### **Phase 2: Stability & Scale**
- [ ] Add unit & E2E tests
- [ ] Implement error tracking (Sentry)
- [ ] Add API rate limiting
- [ ] Set up CI/CD pipeline

### **Phase 3: Mobile Parity**
- [ ] Create mobile component library
- [ ] Implement mobile API service
- [ ] Add offline message caching
- [ ] Push notifications

### **Phase 4: Polish**
- [ ] Chat search & filtering
- [ ] Export/import conversations
- [ ] Artifact viewer/editor
- [ ] Performance optimization

---

## Tech Stack Summary

| Layer | Technologies | Status |
|-------|-------------|--------|
| **Frontend Web** | React 19, Vite, Tailwind, Lucide, Motion, Three.js | ✅ Functional |
| **Mobile** | React Native, Expo, Expo Router | ⚠️ Partial |
| **Backend** | Express.js, TypeScript | ✅ Functional |
| **AI/ML** | Google Gemini 3 Flash, Structured Outputs | ✅ Functional |
| **Database** | Firebase/Firestore | ✅ Functional |
| **Auth** | Firebase Authentication | ✅ Backend ready |
| **Infrastructure** | Docker, (Cloud Run/AWS ready) | ⚠️ Not deployed |
| **Testing** | N/A | ❌ Missing |
