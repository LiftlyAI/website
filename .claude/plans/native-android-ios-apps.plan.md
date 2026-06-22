# Plan: Full Native Android/iOS Apps with Website Sync

**Source**: Verbal requirement for full native mobile apps to replace Capacitor WebView shells
**Selected Approach**: Monorepo (Turborepo) + API-first + Offline-first with sync
**Complexity**: Large (12–16 weeks sequential: monorepo → Android → iOS)
**Platform Order**: Android first, then iOS

## Summary

Convert Liftly from WebView-based Capacitor shells to full native Android/iOS apps. Use a monorepo to share API contracts, types, and business logic across all three platforms (web, Android, iOS). Each platform consumes the same REST API backend; changes to business logic or API contracts propagate automatically to all clients.

## Architecture: Shared Contracts + Native Clients

```
Backend (Next.js)
    ↓
    REST API (Zod-validated, typed responses)
    ↑
┌───┴────┬──────────┬──────────┐
│        │          │          │
Web   Android      iOS      Desktop
(React) (Kotlin) (Swift)    (future)
```

All platforms import:
- **shared-types** — `AthleteProfile`, `Exercise`, API schemas, typed client
- **shared-logic** — `readinessModifier()`, `estimatedOneRM()`, calculations (pure functions)
- **Backend** — REST API (unchanged)

Changes to logic in `shared-logic` → all platforms auto-update on rebuild.
New API endpoint → add Zod schema → all clients get typed support immediately.

## Patterns to Mirror

| Category | Current | Shared Package |
|----------|---------|-----------------|
| Types | `src/lib/types.ts` (local) | `shared-types/src/types.ts` |
| Validation | Zod in `src/app/api/*/route.ts` | `shared-types/src/api.ts` |
| Business Logic | `src/lib/*.ts` (calculations) | `shared-logic/src/*.ts` |
| Auth | `src/lib/auth.ts` (session) | `shared-types/src/auth.ts` (constants) |
| API Client | Fetch in components | `shared-types/src/client.ts` (typed wrapper) |

## Files to Change

| File | Action | Why |
|------|--------|-----|
| `package.json` (root) | CREATE | Turborepo workspace root |
| `turbo.json` | CREATE | Monorepo config (build order, caching) |
| `packages/shared-types/` | CREATE | Extract types, Zod schemas, API client |
| `packages/shared-logic/` | CREATE | Move pure functions (readiness, programming, velocity, calculations) |
| `packages/backend/` | UPDATE | Remove local copies of types; import from shared-types |
| `packages/web/` | UPDATE | Remove local copies; import from shared-types, shared-logic |
| `packages/mobile-android/` | CREATE | Full Kotlin/Jetpack Compose app |
| `packages/mobile-ios/` | CREATE | Full Swift/SwiftUI app (phase 2) |
| `android/` | DELETE | Old Capacitor shell; move to `packages/mobile-android/` |
| `ios/` | DELETE | Old Capacitor shell; move to `packages/mobile-ios/` (phase 2) |

## Implementation Phases

### Phase 1: Monorepo Setup + Shared Packages (Week 1)

**Goal:** Extract shared types and logic so all platforms can build on common ground.

#### Task 1.1: Initialize Turborepo Root
- Create root `package.json` with `"workspaces": ["packages/*", "apps/*"]`
- Install Turborepo: `npm install -D turbo`
- Create `turbo.json`:
  ```json
  {
    "pipeline": {
      "build": { "dependsOn": ["^build"] },
      "test": { "dependsOn": ["^build"] }
    }
  }
  ```
- **Validate**: `npx turbo run build --dry-run` shows correct build order

#### Task 1.2: Create shared-types Package
- Mkdir `packages/shared-types`
- Create `package.json`, `tsconfig.json`, `src/index.ts`
- **Extract from `src/lib/types.ts`:**
  - `AthleteProfile`, `Exercise`, `Program`, `SessionLog`, `RepMetric`, `BarPathPoint`
  - All enums: `Unit`, `Sex`, `Experience`, `LiftType`, etc.
- **Extract Zod schemas from API routes:**
  - Collect all Zod schemas from `src/app/api/*/route.ts`
  - Organize by domain: `readinessSchema`, `sessionLogSchema`, `programSchema`, etc.
  - Export as `export const Schemas = { readiness: z.object(...), ... }`
- **Create typed API client:**
  ```typescript
  export interface ApiClient {
    post<T>(path: string, body: unknown, schema: z.ZodSchema): Promise<T>
    get<T>(path: string, schema: z.ZodSchema): Promise<T>
  }
  export function createApiClient(baseUrl: string, token: string): ApiClient { ... }
  ```
- **Export from `src/index.ts`:**
  ```typescript
  export * from './types'
  export * from './schemas'
  export * from './client'
  ```
- **Validate**: `npm test` passes; can import `import { AthleteProfile } from 'shared-types'`

#### Task 1.3: Create shared-logic Package
- Mkdir `packages/shared-logic`
- Create `package.json`, `tsconfig.json`, `src/index.ts`
- **Move pure functions (no framework deps):**
  - `src/readiness.ts` → `readinessModifier(data: ReadinessInput): ReadinessAssessment`
  - `src/calculations.ts` → `estimatedOneRM`, `macroTargets`, `bmr`, `katch`, `activityMultiplier`, etc.
  - `src/velocity.ts` → `estimateRpe`, `clampRpe`, `curveFor`, etc.
  - `src/programming.ts` → `suggestWeight`, `rpePercent`, `extractLifterSets`, etc.
  - Keep only inputs/outputs (types imported from shared-types); no database calls
- **Export from `src/index.ts`:**
  ```typescript
  export * from './readiness'
  export * from './calculations'
  export * from './velocity'
  export * from './programming'
  ```
- **Validate**: `npm test` — all calculation tests pass; no framework imports

#### Task 1.4: Refactor Backend
- Update `backend/package.json` to include `shared-types` and `shared-logic` as dependencies
- Remove `src/lib/types.ts`; import from `shared-types`
- Update API routes:
  ```typescript
  // Before: const Body = z.object({ ... })
  // After: import { Schemas } from 'shared-types'
  const Body = Schemas.sessionLog
  ```
- Test: `npm run test` passes; `npm run build` succeeds

#### Task 1.5: Refactor Web App
- Update `web/package.json` to include `shared-types` and `shared-logic`
- Remove local `src/lib/types.ts`, duplicate calculations
- Update imports:
  ```typescript
  // Before: import { AthleteProfile } from '@/lib/types'
  // After: import { AthleteProfile } from 'shared-types'
  import { readinessModifier } from 'shared-logic'
  ```
- Test: `npm run dev` runs; dashboard still works

**Deliverable**: Monorepo with 3 packages (shared-types, shared-logic, backend) all using shared code. Web app refactored and running.

---

### Phase 2: Android App Foundation (Weeks 2–3)

**Goal:** Build native Android shell with auth, offline storage, and sync mechanism.

#### Task 2.1: Project Setup
- Initialize Android project: `Android Studio → New Project → Empty Activity`
- Set min API 24, target API 35
- Add Gradle dependencies:
  ```gradle
  // Networking
  implementation 'com.squareup.retrofit2:retrofit:2.11.0'
  implementation 'com.squareup.retrofit2:converter-moshi:2.11.0'
  
  // Local Database
  implementation 'androidx.room:room-runtime:2.6.1'
  kaptAndroidTest 'androidx.room:room-compiler:2.6.1'
  
  // Auth & Supabase
  implementation 'io.github.supabase:gotrue-kt:2.0.0'
  
  // UI
  implementation 'androidx.compose.ui:ui:1.7.0'
  implementation 'androidx.compose.material3:material3:1.2.0'
  
  // State Management
  implementation 'androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0'
  
  // Testing
  testImplementation 'junit:junit:4.13.2'
  androidTestImplementation 'androidx.room:room-testing:2.6.1'
  ```
- **Validate**: Empty app compiles and runs on emulator

#### Task 2.2: Shared Types Integration (Kotlin)
- Add `shared-types` npm package as dependency
  - Option A: Use JitPack or similar to publish npm → Maven (complex)
  - Option B: **Recommend**: Copy `shared-types/src/types.ts` output as JSON schema → auto-generate Kotlin data classes using Kotlinx.serialization or Moshi codegen
  - Option C: Hand-translate key types to Kotlin (simpler for v1)
- Create `app/src/main/kotlin/com/liftly/liftly/data/models/`
  ```kotlin
  @Serializable
  data class AthleteProfile(
    val name: String,
    val email: String,
    val age: Int,
    // ... mirror shared-types
  )
  ```
- **Validate**: Compiles; can create instance of `AthleteProfile`

#### Task 2.3: Supabase Auth Integration
- Initialize Supabase client in `app/src/main/kotlin/com/liftly/liftly/services/AuthService.kt`
  ```kotlin
  object AuthService {
    val client = createSupabaseClient(
      supabaseUrl = BuildConfig.SUPABASE_URL,
      supabaseKey = BuildConfig.SUPABASE_ANON_KEY
    ) {
      install(GoTrue)
    }
    
    suspend fun login(email: String, password: String) {
      val session = client.auth.signInWithPassword(email, password)
      // Store session token locally
      SessionStore.saveToken(session.accessToken)
    }
  }
  ```
- Store session token in SharedPreferences/DataStore
- On app start, restore token if exists; validate with backend
- **Validate**: Can log in; token persisted across app restart

#### Task 2.4: Room Local Database Setup
- Create Room entities in `app/src/main/kotlin/com/liftly/liftly/data/local/entities/`
  ```kotlin
  @Entity(tableName = "athletes")
  data class AthleteEntity(
    @PrimaryKey val id: String,
    val name: String,
    // ... mirror backend schema
  )
  
  @Entity(tableName = "programs")
  data class ProgramEntity(
    @PrimaryKey val id: String,
    val athleteId: String,
    val programJson: String, // serialize to JSON
    // ...
  )
  
  @Entity(tableName = "session_logs")
  data class SessionLogEntity(
    @PrimaryKey val id: String,
    val athleteId: String,
    val date: String,
    val exercisesJson: String,
    // ...
  )
  ```
- Create DAOs in `app/src/main/kotlin/com/liftly/liftly/data/local/dao/`
  ```kotlin
  @Dao
  interface AthleteDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(athlete: AthleteEntity)
    
    @Query("SELECT * FROM athletes WHERE id = :id")
    fun getById(id: String): Flow<AthleteEntity?>
  }
  ```
- Create Room Database
  ```kotlin
  @Database(
    entities = [AthleteEntity::class, ProgramEntity::class, SessionLogEntity::class, ...],
    version = 1
  )
  abstract class LiftlyDatabase : RoomDatabase() {
    abstract fun athleteDao(): AthleteDao
    abstract fun programDao(): ProgramDao
    abstract fun sessionLogDao(): SessionLogDao
  }
  ```
- **Validate**: Can insert/query entities; database file created in local storage

#### Task 2.5: Retrofit API Client Setup
- Create Retrofit service in `app/src/main/kotlin/com/liftly/liftly/data/remote/`
  ```kotlin
  interface LiftlyApiService {
    @POST("/api/session/log")
    suspend fun logSession(@Body body: SessionLogRequest): SessionLogResponse
    
    @GET("/api/program")
    suspend fun getProgram(): ProgramResponse
    
    @POST("/api/readiness")
    suspend fun submitReadiness(@Body body: ReadinessRequest): ReadinessResponse
  }
  ```
- Set up OkHttp interceptor to inject auth token:
  ```kotlin
  val okHttpClient = OkHttpClient.Builder()
    .addInterceptor { chain ->
      val request = chain.request().newBuilder()
        .addHeader("Authorization", "Bearer ${SessionStore.getToken()}")
        .build()
      chain.proceed(request)
    }
    .build()
  ```
- **Validate**: Can make requests to backend; receives typed responses

#### Task 2.6: Sync Service (Offline Detection + Queue)
- Create `app/src/main/kotlin/com/liftly/liftly/services/SyncService.kt`
  ```kotlin
  class SyncService(
    private val apiService: LiftlyApiService,
    private val database: LiftlyDatabase,
    private val connectivityManager: ConnectivityManager
  ) {
    fun observeConnectionState(): Flow<Boolean> {
      return channelFlow {
        val callback = object : ConnectivityManager.NetworkCallback() {
          override fun onAvailable(network: Network) = trySend(true)
          override fun onLost(network: Network) = trySend(false)
        }
        connectivityManager.registerNetworkCallback(
          NetworkRequest.Builder().build(),
          callback
        )
      }
    }
    
    suspend fun syncPendingChanges() {
      // Query database for unsynced changes
      val pendingLogs = database.sessionLogDao().getPendingSync()
      for (log in pendingLogs) {
        try {
          apiService.logSession(log.toRequest())
          database.sessionLogDao().markSynced(log.id)
        } catch (e: Exception) {
          // Log error; retry next sync
        }
      }
    }
  }
  ```
- Hook into app lifecycle to sync on startup and when connection restored
- **Validate**: Offline → log session → goes into local DB; online → syncs to backend

**Deliverable**: Android app with auth, local database, API client, and offline sync framework.

---

### Phase 3: Android Core Screens (Weeks 4–5)

**Goal:** Build screens for login, dashboard, program view, and session logging.

#### Task 3.1: Navigation & App Shell
- Create `app/src/main/kotlin/com/liftly/liftly/ui/navigation/NavGraph.kt`
  ```kotlin
  @Composable
  fun LiftlyNavHost(
    navController: NavHostController,
    startDestination: String = "login"
  ) {
    NavHost(navController = navController, startDestination = startDestination) {
      composable("login") { LoginScreen(navController) }
      composable("dashboard") { DashboardScreen(navController) }
      composable("program") { ProgramScreen(navController) }
      composable("log-session") { LogSessionScreen(navController) }
      composable("readiness") { ReadinessScreen(navController) }
    }
  }
  ```
- Create bottom nav with routes: Dashboard, Program, Readiness, Profile
- **Validate**: Can navigate between screens

#### Task 3.2: Login Screen
- Create `app/src/main/kotlin/com/liftly/liftly/ui/screens/LoginScreen.kt`
  ```kotlin
  @Composable
  fun LoginScreen(
    navController: NavController,
    viewModel: LoginViewModel = hiltViewModel()
  ) {
    val email by viewModel.email.collectAsState()
    val password by viewModel.password.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
      TextField(value = email, onValueChange = viewModel::setEmail, label = { Text("Email") })
      TextField(value = password, onValueChange = viewModel::setPassword, label = { Text("Password") })
      Button(onClick = { viewModel.login() }, enabled = !isLoading) {
        Text(if (isLoading) "Logging in..." else "Login")
      }
    }
    
    LaunchedEffect(viewModel.loginSuccess) {
      if (viewModel.loginSuccess.value) {
        navController.navigate("dashboard") { popUpTo("login") { inclusive = true } }
      }
    }
  }
  ```
- ViewModel calls AuthService.login(), handles errors
- **Validate**: Can log in; navigates to dashboard; token saved

#### Task 3.3: Dashboard Screen
- Create `app/src/main/kotlin/com/liftly/liftly/ui/screens/DashboardScreen.kt`
- Display:
  - Today's readiness status (if submitted)
  - Upcoming sessions (from program)
  - Quick actions: Log readiness, log session, view program
- Fetch from local DB (via Room DAO); updates every time data changes (Flow)
- Sync latest from backend on screen load
- **Validate**: Shows athlete name, upcoming sessions; readiness dial appears

#### Task 3.4: Program Screen
- Create `app/src/main/kotlin/com/liftly/liftly/ui/screens/ProgramScreen.kt`
- Display:
  - Current block + week
  - Days of week with exercises (expandable)
  - Exercise details: sets, reps, target RPE, estimated weight
- Fetch Program from local DB on first load; sync from backend
- **Validate**: Can see program structure; exercises display correctly

#### Task 3.5: Log Session Screen (Multi-step Flow)
- Create `app/src/main/kotlin/com/liftly/liftly/ui/screens/LogSessionScreen.kt`
- Step 1: Pick day (dropdown or calendar)
- Step 2: For each exercise, enter sets: reps, weight, actual RPE
- Step 3: Optional bodyweight, notes
- Step 4: Submit
- On submit:
  - Save to local DB with `synced = false`
  - Try to POST to backend immediately
  - If offline, mark for sync later
  - Show success toast
- **Validate**: Can log a session offline; syncs when online

#### Task 3.6: Readiness Screen
- Create `app/src/main/kotlin/com/liftly/liftly/ui/screens/ReadinessScreen.kt`
- Dial inputs: sleep, energy, soreness, stress (1–10)
- Optional: pain level, pain note
- Call `readinessModifier()` from shared-logic locally to compute assessment
- Submit to backend (with offline queue)
- Show assessment: "Ready to train" / "Proceed with caution" / "Take a break"
- **Validate**: Can submit readiness; dial shows appropriate assessment

#### Task 3.7: Profile Screen (Minimal v1)
- Show athlete name, email, goals
- Logout button
- Settings link (future)
- **Validate**: Shows athlete info; logout clears session

**Deliverable**: Fully functional Android app with login, dashboard, program view, session logging, and readiness tracking.

---

### Phase 4: Polish & Sync Refinement (Week 6)

#### Task 4.1: Error Handling & User Feedback
- Add Snackbars for errors (network, validation, server)
- Add loading states (spinners) on buttons
- Handle 401 (session expired) → force re-login
- Handle network errors gracefully → show "offline" indicator
- **Validate**: App handles errors without crashing

#### Task 4.2: Offline-to-Online Sync Improvements
- On resume, check connection state; if online, sync immediately
- Show sync status: "Syncing..." or "Synced at HH:MM"
- Retry failed syncs with exponential backoff
- **Validate**: Offline changes → go online → changes synced within 5 sec

#### Task 4.3: Testing
- Unit tests for ViewModels (mocking API + DB)
- Integration tests for local DB (CRUD operations)
- E2E test: login → log session → verify synced to backend
- **Validate**: `./gradlew test` passes; E2E test succeeds

#### Task 4.4: Design & Theming
- Apply Liftly design tokens:
  - Colors: Iron (black), Chalk (white), Blood (electric blue)
  - Typography: Space Grotesk for headers, Inter for body
- Use Material 3 theme with custom colors
- Ensure contrast ratios ≥ 4.5:1 (WCAG AA)
- **Validate**: App looks polished; colors match web

#### Task 4.5: Performance Optimization
- Profile app (Android Profiler) for slow screens
- Optimize Room queries (indexes, pagination)
- Lazy-load program weeks (don't fetch all at once)
- Measure cold start time; target < 2 sec
- **Validate**: App starts quickly; smooth scrolling; no jank

**Deliverable**: Production-ready Android app with robust error handling, offline sync, and performance tuning.

---

### Phase 5: Play Store Launch (Week 7)

#### Task 5.1: Release Build Setup
- Generate signing key: `keytool -genkey -v -keystore liftly.jks -keyalg RSA -keysize 2048 -validity 10000 -alias liftly`
- Configure release signing in `build.gradle`:
  ```gradle
  signingConfigs {
    release {
      storeFile file(System.getenv("KEYSTORE_PATH") ?: "liftly.jks")
      storePassword System.getenv("KEYSTORE_PASSWORD")
      keyAlias System.getenv("KEY_ALIAS")
      keyPassword System.getenv("KEY_PASSWORD")
    }
  }
  ```
- Build release AAB: `./gradlew bundleRelease`
- **Validate**: AAB generated; size ~50–100 MB

#### Task 5.2: Play Store Console Setup
- Create developer account ($25 one-time fee)
- Create app: "Liftly" (com.liftly.liftly)
- Fill store listing: description, screenshots, privacy policy
- Set pricing: Free
- **Validate**: Store listing complete

#### Task 5.3: Internal Test Release
- Upload AAB to Play Console → Testing → Internal testing
- Add test accounts (e.g., your own)
- Download from Play Store; test on physical device
- **Validate**: Can install, log in, use app end-to-end

#### Task 5.4: Staged Rollout
- Upload AAB to production
- Set staged rollout: 5% → 25% → 100%
- Monitor crash rates, ratings, user feedback
- Rollback if > 5% crashes
- **Validate**: App live on Play Store; no crashes reported

**Deliverable**: Liftly app live on Google Play Store.

---

## Validation Strategy

### Unit Tests
```bash
# shared-logic tests
cd packages/shared-logic
npm test

# backend API tests
cd packages/backend
npm test

# Android unit tests
cd packages/mobile-android
./gradlew test
```

### Integration Tests (Android)
```bash
# Local Room database CRUD
# Retrofit API client + OkHttp mocking
./gradlew connectedAndroidTest
```

### End-to-End Test
1. Start fresh: delete app data
2. Login: email/password (create test account first)
3. Log session: enter sets/reps/RPE for 1 exercise
4. Go offline: disable WiFi + mobile data
5. Log another session
6. Go online: enable WiFi
7. Check backend: both sessions synced
8. Verify in dashboard: both sessions visible

### Performance Benchmarks
- Cold start: < 2 sec
- Sync time (10 sessions): < 3 sec
- Screen transition: < 500 ms (no jank)
- APK size: < 100 MB

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Zod schema → Kotlin translation errors | MEDIUM | Types mismatch w/ backend | Hand-translate key types v1; add validation in client |
| Room schema drift vs backend | MEDIUM | Data loss on migration | Version migrations + integration tests |
| Sync merge conflicts (offline on 2 devices) | LOW | Data inconsistency | Last-write-wins strategy; document limitation v1 |
| API client auth token expiry | LOW | Forced logout | Auto-refresh on 401; retry request |
| Large APK size | MEDIUM | Play Store rejection | Minimize dependencies; use ProGuard |
| Emulator slow/unreliable | MEDIUM | Dev friction | Test on physical device; use Android Studio cloud emulator |

---

## Acceptance Criteria

✓ Monorepo created; shared-types/shared-logic packages working
✓ Backend + web refactored to use shared packages; tests pass
✓ Android app compiles (targeting API 24+)
✓ Android login works; session token persisted
✓ Android offline DB: can save session locally without network
✓ Android sync: logs synced to backend when online
✓ Android UI: all 5 screens functional (login, dashboard, program, log, readiness, profile)
✓ Android error handling: graceful failures, retry logic
✓ Android E2E: offline → log → online → verify synced
✓ Android performance: cold start < 2 sec, smooth scrolling
✓ Android live on Google Play Store (5% staged rollout)

---

## After Android Launch: iOS Plan (Weeks 8–14)

Once Android is live and stable:

1. **Create mobile-ios package** (Week 8)
   - Swift project structure (MVVM + SwiftUI)
   - Same `shared-types` types (hand-translate or use Swift Package)
   - Same `shared-logic` (hand-translate functions)

2. **iOS auth + local storage** (Week 9)
   - Supabase Swift SDK for login
   - Core Data + CloudKit for offline-first
   - Sync service (CloudKit handles most)

3. **iOS screens** (Weeks 10–11)
   - Feature-parity with Android
   - SwiftUI implementations of all screens

4. **iOS polish & testing** (Week 12)
   - Error handling, performance tuning
   - Device testing on physical iPhone

5. **iOS App Store launch** (Week 13)
   - TestFlight beta testing
   - App Store submission + review

6. **Monitor & iterate** (Week 14)
   - Fix crashes, gather feedback
   - Plan v1.1 features

---

## Success Criteria

**At end of Phase 5 (Android Launch):**
- ✓ Android app live on Play Store
- ✓ 100+ downloads in first week
- ✓ No critical bugs reported
- ✓ User retention > 30% (DAU after 7 days)

**At end of Phase 13 (iOS Launch):**
- ✓ iOS app live on App Store
- ✓ Feature parity with Android
- ✓ Both platforms syncing correctly

**Long-term:**
- ✓ Single business logic codebase (shared-logic)
- ✓ New API endpoints auto-available to all platforms
- ✓ Web + Android + iOS release together (or independently as needed)

